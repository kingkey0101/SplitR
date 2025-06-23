import { internal } from "./_generated/api";
import { query } from "./_generated/server";

//get user balances
export const getUserBalances = query({
  handler: async (ctx) => {
    const user = await ctx.runQuery(internal.users.getCurrentUser);

    // 1-1 expenses(no groupId)
    //filter expenses to only include 1 on 1 expenses
    //where the curren user is either the payer or in the splits
    const expenses = (await ctx.db.query("expenses").collect()).filter(
      (e) =>
        !e.groupId && //1-1 only
        (e.paidByUserId === user._id ||
          e.splits.some((s) => s.userId === user._id))
    );

    let youOwe = 0; //total amount user owes others
    let youAreOwed = 0; //total amount others owe you
    const balanceByUser = {}; //detailed breakdown per user
    //process each expense to calculate balances

    for (const e of expenses) {
      const isPayer = e.paidByUserId === user._id;
      const mySplit = e.splits.find((s) => s.userId === user._id);

      if (isPayer) {
        for (const s of e.splits) {
          //skip users own split or already paid splits
          if (s.userId === user._id || s.paid) continue;

          //add to amount owed to the user
          youAreOwed += s.amount;

          (balanceByUser[s.userId] ??= { owed: 0, owing: 0 }).owed += s.amount;
        }
      } else if (mySplit && !mySplit.paid) {
        //someone else paid and user hasn't paid their split yet
        youOwe += mySplit.amount;

        //add to the amount the current user owes to the payer
        (balanceByUser[e.paidByUserId] ??= { owed: 0, owing: 0 }).owing +=
          mySplit.amount;
      }
    }

    /*1-1 settlements (no groupId)
    get settlements that directly involve the current user */
    const settlements = (await ctx.db.query("settlements").collect()).filter(
      (s) =>
        !s.groupId &&
        (s.paidByUserId === user._id || s.receivedByUserId === user._id)
    );

    for (const s of settlements) {
      if (s.paidByUserId === user._id) {
        //user paid someone else -> reduce what user owes
        youOwe -= s.amount;
        (balanceByUser[s.receivedByUserId] ??= { owed: 0, owing: 0 }).owing -=
          s.amount;
      } else {
        //someone paid the user -> reduces what they owe user
        youAreOwed -= s.amount;
        (balanceByUser[s.paidByUserId] ??= { owed: 0, owing: 0 }).owed -=
          s.amount;
      }
    }

    /*build lists for UI */
    const youOweList = []; //list of people user owes money to
    const youAreOwedByList = []; //list of people who owe the user

    for (const [uid, { owed, owing }] of Object.entries(balanceByUser)) {
      const net = owed - owing; //calculate net balance
      if (net === 0) continue; //skip if balnced

      //get user details
      const counterpart = await ctx.db.get(uid);
      const base = {
        userId: uid,
        name: counterpart?.name ?? "Unknown",
        imageUrl: counterpart?.imageUrl,
        amount: Math.abs(net),
      };

      //add to appropriate list
      net > 0 ? youAreOwedByList.push(base) : youOweList.push(base);
    }

    //sort by higest first
    youOweList.sort((a, b) => b.amount - a.amount);
    youAreOwedByList.sort((a, b) => b.amount - a.amount);

    //returning all balance info
    return {
      youOwe, //total amount user owes
      youAreOwed, //total amount owed to user
      totalBalance: youAreOwed - youOwe, //net balance
      oweDetails: { youOwe: youOweList, youAreOwedBy: youAreOwedByList }, //detailed lists
    };
  },
});

//* api for calcuating total spent in curent year */
export const getTotalSpent = query({
  handler: async (ctx) => {
    const user = await ctx.runQuery(internal.users.getCurrentUser);

    //timestamp
    const currentYear = new Date().getFullYear();
    const startOfYear = new Date(currentYear, 0, 1).getTime();
    const expenses = await ctx.db
      .query("expenses")
      .withIndex("by_date", (q) => q.gte("date", startOfYear));

    //filter expenses to only include those where the user is involved
    const userExpenses = expenses.filter(
      (expense) =>
        expense.paidByUserId === user._id ||
        expense.splits.some((split) => split.userId === user._id)
    );

    //calculating total spent
    let totalSpent = 0;

    userExpenses.forEach((expense) => {
      const userSplit = expense.splits.find(
        (split) => split.userId === user._id
      );

      if (userSplit) {
        totalSpent += userSplit.amount;
      }
    });
    return totalSpent;
  },
});

//calculating monthly spending
export const getMonthlySpending = query({
  handler: async (ctx) => {
    //check if user is logged in or not
    const user = await ctx.runQuery(internal.users.getCurrentUser);

    //current year and timestamp
    const currentYear = new Date().getFullYear();
    const startOfYear = new Date(currentYear, 0, 1).getTime();

    //get all expenses for current year
    const allExpenses = await ctx.db
      .query("expenses")
      .withIndex("by_date", (q) => q.gte("date", startOfYear))
      .collect();

    const userExpenses = allExpenses.filter(
      (expense) =>
        expense.paidByUserId === user._id ||
        expense.splits.some((split) => split.userId === userId)
    );

    const monthlyTotals = {};

    for (let i = 0; i < 12; i++) {
      const monthDate = new Date(currentYear, i, 1);
      monthlyTotals[monthDate.getTime()] = 0;
    }

    userExpenses.forEach((expense) => {
      const date = new Date(expense.date);

      const monthStart = new Date(
        date.getFullYear(),
        date.getMonth(),
        1
      ).getTime();

      const userSplit = expense.splits.find(
        (split) => split.userId === user._id
      );

      if (userSplit) {
        monthlyTotals[monthStart] =
          (monthlyTotals[monthStart] || 0) + userSplit.amount;
      }
    });

    const result = Object.entries(monthlyTotals).map(([month, total]) => ({
      month: parseInt(month),
      total,
    }));

    //sort by month
    result.sort((a, b) => a.month - b.month);

    return result;
  },
});

export const getUserGroups = query({
  handler: async (ctx) => {
    const user = await ctx.runQuery(internal.users.getCurrentUser);

    //get all groups from db
    const allGroups = await ctx.db.query("groups").collect();

    //filter to only include groups where user is memeber
    const groups = allGroups.filter((group) =>
      group.members.some((member) => member.userId === user._id)
    );

    //enhance each group to have balance info
    const enhancedGroups = await Promise.all(
      groups.map(async (group) => {
        //get all expenses for specific group
        const expenses = await ctx.db
          .query("expenses")
          .withIndex("by_group", (q) => q.eq("groupId", group._id))
          .collect();

        let balance = 0;

        //calculate balance from expenses
        expenses.forEach((expense) => {
          if (expense.paidByUserId === user._id) {
            //user paid for the expense - others may owe them
            expense.splits.forEach((split) => {
              //add amounts others owe to the user (excluding users own split and paid splits)
              if (split.userId !== user._id && !split.paid) {
                balance += split.amount;
              }
            });
          } else {
            //someone else paid - user may owe them
            const userSplit = expense.splits.find(
              (split) => split.userId === user._id
            );
            //subtract amounts the user owes others
            if (userSplit && !userSplit.paid) {
              balance -= userSplit.amount;
            }
          }
        });

        //apply settlements to adjust the balance
        const settlements = await ctx.db
          .query("settlements")
          .filter((q) =>
            q.and(
              q.eq(q.field("groupId"), group._id),
              q.or(
                q
                  .eq(q.field("paidByUserId"), user._id)
                  .q.eq(q.field("receivedByUserId"), user._id)
              )
            )
          )
          .collect();

        settlements.forEach((settlement) => {
          if (settlement.paidByUserId === user._id) {
            //user paid someone in the group - increases user balance
            balance += settlement.amount;
          } else {
            //someone paid the user - decrease user balance
            balance -= settlement.amount;
          }
        });

        return {
          ...group,
          id: group._id,
          balance,
        };
      })
    );

    return enhancedGroups;
  },
});
