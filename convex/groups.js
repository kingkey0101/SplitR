import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";

export const getGroupExpenses = query({
  args: { groupId: v.id("groups") },
  handler: async (ctx, { groupId }) => {
    const currentUser = await ctx.runQuery(internal.users.getCurrentUser);
    const group = await ctx.db.get(groupId);
    if (!group) throw new Error("Group not found");

    if (!group.members.some((m) => m.userId === currentUser._id))
      throw new Error("You are not a member of this group"); //searching schema to check for user

    const expenses = await ctx.db
      .query("expenses")
      .withIndex("by_group", (q) => q.eq("groupId", groupId))
      .collect();

    const settlements = await ctx.db
      .query("settlements")
      .filter((q) => q.eq(q.field("groupId"), groupId))
      .collect();

    //   member map
    const memberDetails = await Promise.all(
      group.members.map(async (m) => {
        const u = await ctx.db.get(m.userId);
        return {
          id: u._id,
          name: u.name,
          imageUrl: u.imageUrl,
          role: m.role,
        };
      })
    );

    //getting member id
    const ids = memberDetails.map((m) => m.id);
    // creating ledgers fear each user (accounting expenses, settlements)
    // balance calculation setup
    // initialize totals object to track overall balance for each user
    // format: { userId1: balance1, userId2: balance2, ... }
    const totals = Object.fromEntries(ids.map((id) => [id, 0]));

    // creating two-dimensional ledgr to track who owes who
    // ledger[A][B] = how much A owes B
    // example for 3 users (user1, user2, user3):
    // ledger = {
    // 'user1': {'user2': 0, 'user3': 0}},
    // 'user2': {'user1': 0, 'user3': 0}},
    // 'user3': {'user1': 0, 'user2': 0}}
    //}

    const ledger = {};

    ids.forEach((a) => {
      ledger[a] = {};
      ids.forEach((b) => {
        if (a != b) ledger[a][b] = 0;
      });
    });

    for (const exp of expenses) {
      const payer = exp.paidByUserId;

      for (const split of exp.splits) {
        //skip if this is payer own split or already paid
        if (split.userId === payer || split.paid) continue;
        const debtor = split.userId;
        const amt = split.amount;
        //Update totals: increase payers balance, decrease debtors balance
        totals[payer] += amt; //payer gains credit
        totals[debtor] -= amt; //debtor goes into debt

        ledger[debtor][payer] += amt;
      }
    }
    for (const s of settlements) {
      //update totals: increase payers balance, decrease receivers balance
      totals[s.paidByUserId] += s.amount;
      totals[s.receivedByUserId] -= s.amount;

      //update ledger: reduce what the payer owes to the receiver
      ledger[s.paidByUserId][s.receivedByUserId] -= s.amount;
    }

    //simplify the ledger(reducing circular debt pattern)
    ids.forEach((a) => {
      ids.forEach((b) => {
        if (a >= b) return;

        //calculate net debt between two users
        const diff = ledger[a][b] - ledger[b][a];
        if (diff > 0) {
          //user a owes user b (net)
          ledger[a][b] = diff;
          ledger[b][a] = 0;
        } else if (diff < 0) {
          //user b owes user a
          ledger[b][a] = -diff;
          ledger[a][b] = 0;
        } else {
          //they are even
          ledger[a][b] = ledger[b][a] = 0;
        }
      });
    });

    //format response data-> create comprehensive balance object for each member
    const balance = memberDetails.map((m) => ({
      ...m,
      totalBalance: totals[m.id],
      owes: Object.entries(ledger[m.id])
        .filter(([, v]) => v > 0)
        .map(([to, amount]) => ({ to, amount })),
      owedBy: ids
        .filter((other) => ledger[other][m.id] > 0)
        .map((other) => ({ from: other, amount: ledger[other][m.id] })),
    }));

    const userLookupMap = {};
    memberDetails.forEach((member) => {
      userLookupMap[member.id] = member;
    });

    return {
      //group info
      group: {
        id: group._id,
        name: group.name,
        description: group.description,
      },
      members: memberDetails, //all group memebers w/details
      expenses, //all expenses in this group
      settlements, //all settlements in this group
      balances: balance, //calculated balance info for each member
      userLookupMap, //quick lookup for user details
    };
  },
});

export const deleteExpense = mutation({
  args: {
    expenseId: v.id("expenses"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.runQuery(internal.users.getCurrentUser);
    const expense = await ctx.db.get(args.expensedId);
    if (!expense) {
      throw new Error("Expense not found");
    }

    //check if user is authorized to delete this expense
    // only the creator of expense or payer can delete it
    if (expense.createdBy !== user._id && expense.paidByUserId !== user._id) {
      throw new Error("You don't have permission to delete this expense");
    }

    await ctx.db.delete(args.expenseId);
    return { success: true };
  },
});
