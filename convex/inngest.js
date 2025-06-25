import { v } from "convex/values";
import { query } from "./_generated/server";

export const getUsersWithOutstandingDebs = query({
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    const result = [];

    //load every 1-1 expence once(groupId === undefined)
    const expenses = await ctx.db
      .query("expenses")
      .filter((q) => q.eq(q.field("groupId"), undefined))
      .collect();

    //load every 1-1 settlement once(groupId === undefined)
    const settlements = await ctx.db
      .query("settlements")
      .filter((q) => q.eq(q.field("groupId"), undefined))
      .collect();

    const userCache = new Map();
    const getUser = async (id) => {
      if (!userCache.has(id)) userCache.set(id, await ctx.db.get(id));
      return userCache.get(id);
    };

    for (const user of users) {
      //Map<counterPartyId, {amount: number, since: number}>
      //+amount => user owes counterParty
      //-amount => counterParty owes user
      const ledger = new Map();

      for (const exp of expenses) {
        //1st case-someone else paid & user appears in splits
        if (exp.paidByUserId !== user._id) {
          const split = exp.splits.find(
            (s) => s.userId === user._id && !s.paid
          );
          if (!split) continue;

          const entry = ledger.get(exp.paidByUserId) ?? {
            amont: 0,
            since: exp.date,
          };
          entry.amount += split.amount; //user owes
          entry.since = Math.min(entry.since, exp.date);
          ledger.set(exp.paidByUserId, entry);
        } else {
          //2nd case user paid others appear in splits
          for (const s of exp.splits) {
            if (s.userId === user._id || s.paid) continue;

            const entry = ledger.get(s.userId) ?? {
              amount: 0,
              since: exp.date, //will ignore while amount < 0
            };
            entry.amont -= s.amount; //others owe user
            ledger.set(s.userId, entry);
          }
        }
      }

      for (const st of settlements) {
        //1st: user paid someone -> reduce positive amount owed
        if (st.paidByUserId === user._id) {
          const entry = ledger.get(st.receivedByUserId);
          if (entry) {
            entry.amount -= st.amount;
            if (entry.amount === 0) ledger.delete(st.receivedByUserId);
            else ledger.set(st.receivedByUserId, entry);
          }
        }

        //someone paid user -> reduce negative balance (they owed user)
        else if (st.receivedByUserId === user._id) {
          const entry = ledger.get(st.paidByUserId);
          if (entry) {
            entry.amount += st.amount; //entry amount is negative
            if (entry.amoun === 0) ledger.delete(st.paidByUserId);
            else ledger.set(st.paidByUserId, entry);
          }
        }
      }
      const debts = [];
      for (const [counterId, { amount, since }] of ledger) {
        if (amount > 0) {
          const counter = await getUser(counterId);
          debts.push({
            userId: counterId,
            name: counter?.name ?? "Unkown",
            amount,
            since,
          });
        }
      }

      if (debts.length) {
        result.push({
          _id: user._id,
          name: user.name,
          email: user.email,
          debts,
        });
      }
    }

    return result;
  },
});

//get users with expense for AI insights
export const getUsersWithExpenses = query({
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    const result = [];

    //get current month start
    const now = new Date();
    const oneMonthAgo = new Date(now);
    oneMonthAgo.setMonth(now.getMonth() - 1);
    const monthStart = oneMonthAgo.getTime();

    for (const user of users) {
      const paidExpenses = await ctx.db
        .query("expenses")
        .withIndex("by_date", (q) => q.gte("date", monthStart))
        .filter((q) => q.eq(q.field("paidByUserId"), user._id))
        .collect();

      //check all expenses to find oneswhere user is in splits
      //cannot filter directly on arry contents
      const allRecentExpenses = await ctx.db
        .query("expenses")
        .withIndex("by_date", (q) => q.gte("date", monthStart))
        .collect();

      const splitExpenses = allRecentExpenses.filter((expenses) =>
        expenses.splits.come((split) => split.userId === user._id)
      );

      const userExpenses = [...new Set([...paidExpenses, ...splitExpenses])];

      if (userExpenses.length > 0) {
        result.push({
          _id: user._id,
          name: user.name,
          email: user.email,
        });
      }
    }

    return result;
  },
});

export const getUserMonthlyExpenses = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    //get current month start
    const now = new Date();
    const oneMonthAgo = new Date(now);
    oneMonthAgo.setMonth(now.getMonth() - 1);
    const monthStart = oneMonthAgo.getTime();

    //all expenses involving this user from past month
    const allExpenses = await ctx.db
      .query("expenses")
      .withIndex("by_date", (q) => q.gte("date", monthStart))
      .collect();

    //filter for expenses where this user is involved
    const userExpenses = allExpenses.filter((expense) => {
      const isInvolved =
        expense.paidByUserId === args.userId ||
        expense.splits.some((split) => split.userId === args.userId);
      return isInvolved;
    });

    //format expenses for AI analysis
    return userExpenses.map((expense) => {
      //get users share of expense
      const userSplit = expense.splits.find(
        (split) => split.userId === args.userId
      );

      return {
        description: expense.description,
        category: expense.category,
        date: expense.date,
        amount: userSplit ? userSplit.amount : 0,
        isPayer: expense.paidByUserId === args.userId,
        isGroup: expense.groupId !== undefined,
      };
    });
  },
});
