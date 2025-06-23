import { v } from "convex/values";
import { query } from "./_generated/server";
import { internal } from "./_generated/api";
// using indexes to make better code

export const getExpensesBetweenUsers = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const me = await ctx.runQuery(internal.users.getCurrentUser);
    if (me._id === userId) throw new Error("Cannot query yourself");

    // 1-1 expenses where either user is the payer
    const myPaid = await ctx.db
      .query("expenses")
      .withIndex("by_user_and_group", (q) =>
        q.eq("paidByUserId", me._id).eq("groupId", undefined)
      )
      .collect();

    const theirPaid = await ctx.db
      .query("expenses")
      .withIndex("by_user_and_group", (q) =>
        q.eq("paidByUserId", userId).eq("groupId", undefined)
      )
      .collect();

    //merging both
    const candidateExpenses = [...myPaid, ...theirPaid];

    //keep only rows where both users are involved(payer or split)
    const expenses = candidateExpenses.filter((e) => {
      //me is always involved(I'm payer or in splits-verified below)
      const meInSplits = e.splits.some((s) => s.userId === me._id);
      const themInSplits = e.splits.some((s) => s.userId === userId);

      const meInvolved = e.paidByUserId === me._id || meInSplits;
      const themInvolved = e.paidByUserId === userId || themInSplits;

      return meInvolved && themInvolved;
    });

    //sort by date(descending)
    expenses.sort((a, b) => b.date - a.date);

    //settlements between both of us (groupId = undefined)
    const settlements = await ctx.db
      .query("settlements")
      .filter((q) =>
        q.and(
          q.eq(q.field("groupId"), undefined),
          q.or(
            q.and(
              q.eq(q.field("paidByUserId"), me._id),
              q.eq(q.field("receivedByUserId"), userId)
            ),
            q.and(
              q.eq(q.field("paidByUserId"), userId),
              q.eq(q.field("receivedByUserId"), me._id)
            )
          )
        )
      )
      .collect();
    //sort in descending order
    settlements.sort((a, b) => b.date - a.date);

    //computing rinning balance
    let balance = 0;
    for await (const e of expenses) {
      if (e.paidByUserId === me._id) {
        const split = e.splits.find((s) => s.userId === me._id && !s.paid);
        if (split) balance += split.amount; //they owe user
      } else {
        const split = e.splits.find((s) => s.userId === me._id && !s.paid);
        if (split) balance -= split.amount; //user owes them
      }
    }

    for (const s of settlements) {
      if (s.paidByUserId === me._id)
        balance += s.amount; //user paid them back
      else balance -= s.amount; //they paid user back
    }

    // return payload
    const other = await ctx.db.get(userId);
    if (!other) throw new Error("User not found");

    return {
      expenses,
      settlements,
      otherUser: {
        id: other._id,
        name: other.name,
        email: other.email,
        imageUrl: other.imageUrl,
      },
      balance,
    };
  },
});
