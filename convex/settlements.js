import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";

//creating settlement
export const createSettlement = mutation({
  args: {
    amount: v.number(), //has to be > 0
    note: v.optional(v.string()),
    paidByUserId: v.id("users"),
    receivedByUserId: v.id("users"),
    groupId: v.optional(v.id("groups")), //undf for 1-1 settlements
    relatedExpenseIds: v.optional(v.array(v.id("expenses"))),
  },
  handler: async (ctx, args) => {
    const caller = await ctx.runQuery(internal.users.getCurrentUser);

    //validation for ^^ data
    if (args.amount <= 0) throw new Error("Amount must be positive");
    if (args.paidByUserId === args.receivedByUserId) {
      throw new Error("Payer and receiver cannot be the same user");
    }
    if (
      caller._id !== args.paidByUserId &&
      caller._id !== args.receivedByUserId
    ) {
      throw new Error("You must be either the payer or receiver");
    }

    //checking group(if group expense)
    if (args.groupId) {
      const group = await ctx.db.get(args.groupId);
      if (!group) throw new Error("Group not found");

      const isMember = (uid) => group.members.some((m) => m.userId === uid);
      if (!isMember(args.paidByUserId) || !isMember(args.receivedByUserId)) {
        throw new Error("Both parties must be members of the group");
      }
    }

    //adding to DB in settlements table
    return await ctx.db.insert("settlements", {
      amount: args.amount,
      note: args.note,
      date: Date.now(), //timestamp for server
      paidByUserId: args.paidByUserId,
      receivedByUserId: args.receivedByUserId,
      groupId: args.groupId,
      relatedExpenseIds: args.relatedExpenseIds,
      createdBy: caller._id,
    });
  },
});
//info for how much user owes or is owed (function)
export const getSettlementData = query({
  args: {
    entityType: v.string(), //'user' | 'group'
    entityId: v.string(), //convex_id (string) of user/group
  },
  handler: async (ctx, args) => {
    const me = await ctx.runQuery(internal.users.getCurrentUser);

    if (args.entityType === "user") {
      //user page(ver if other user exists)
      const other = await ctx.db.get(args.entityId);
      if (!other) throw new Error("User not found");

      //fetching exps where either user paid/split
      const myExpenses = await ctx.db
        .query("expenses")
        .withIndex("by_user_and_group", (q) =>
          q.eq("paidByUserId", me._id).eq("groupId", undefined)
        )
        .collect();

      const otherUserExpenses = await ctx.db
        .query("expenses")
        .withIndex("by_user_and_group", (q) =>
          q.eq("paidByUserId", other._id).eq("groupId", undefined)
        )
        .collect();

      //merge expenses
      const expenses = [...myExpenses, ...otherUserExpenses];

      let owed = 0; // owe user
      let owing = 0; //user owes

      for (const exp of expenses) {
        //user involved
        const involvesMe =
          exp.paidByUserId === me._id ||
          exp.splits.some((s) => s.userId === other._id);
        //other user involved
        const involvesThem =
          exp.paidByUserId === other._id ||
          exp.splits.some((s) => s.userId === other._id);
        if (!involvesMe || !involvesThem) continue;

        //if user paid
        if (exp.paidByUserId === me._id) {
          const split = exp.splits.find(
            (s) => s.userId === other._id && !s.paid
          );
          if (split) owed += split.amount;
        }

        //other user paid
        if (exp.paidByUserId === other._id) {
          const splt = exp.splits.find((s) => s.userId === me._id && !s.paid);
          if (split) owing += split.amount;
        }

        //fetch settlements for user && other user
        const mySettlements = await ctx.db
          .query("settlements")
          .withIndex("by_user_and_group", (q) =>
            q.eq("paidByUserId", me._id).eq("groupId", undefined)
          )
          .collect();

        const otherUserSettlements = await ctx.db
          .query("settlements")
          .withIndex("by_user_and_group", (q) =>
            q.eq("paidByUserId", other._id).eq("groupId", undefined)
          )
          .collect();

        //merge
        const settlements = [...mySettlements, ...otherUserSettlements];

        for (const st of settlements) {
          if (st.paidByUserId === me._id) {
            //user paid-owing goes down
            owing = Math.max(0, owing - st.amount);
          } else {
            //otherUser paid user - their owing goes down
            owed = Math.max(0, owed - st.amount);
          }
        }
        return {
          type: "user",
          counterpart: {
            userId: other._id,
            name: other.name,
            email: other.email,
            imageUrl: other.imageUrl,
          },
          youAreOwed: owed,
          youOwe: owing,
          netBalance: owed - owing, //+ you recieve - you pay
        };
      }
    } else if (args.entityType === "group") {
      //group page
      const group = await ctx.db.get(args.entityId);
      if (!group) throw new Error("Group not found");

      const isMember = group.members.some((m) => m.userId === me._id);
      if (!isMember) throw new Error("You are not a member of this group");

      //fetch group expense
      const expenses = await ctx.db
        .query("expenses")
        .withIndex("by_group", (q) => q.eq("groupId", group._id))
        .collect();

      //init balances/user
      const balances = {};
      group.members.forEach((m) => {
        if (m.userId !== me._id) balances[m.userId] = { owed: 0, owing: 0 };
      });

      //apply exps
      for (const exp of expenses) {
        if (exp.paidByUserId === me._id) {
          //user paid, other users might owe
          exp.splits.forEach((split) => {
            if (split.userId !== me._id && !split.paid) {
              balances[split.userId].owed += split.amount;
            }
          });
        } else if (balances[exp.paidByUserId]) {
          //another user paid, user might owe
          const split = exp.splits.find((s) => s.userId === me._id && !s.paid);
          if (split) balances[exp.paidByUserId].owing += split.amount;
        }
      }

      //settlements in group
      const settlements = await ctx.db
        .query("settlements")
        .filter((q) => q.eq(q.field("groupId"), group._id))
        .collect();

      for (const st of settlements) {
        //only if user is payer/receiver
        if (st.paidByUserId === me._id && balances[st.receivedByUserId]) {
          balances[st.receivedByUserId].owing = Math.max(
            0,
            balances[st.receivedByUserId].owing - st.amount
          );
        }
        if (st.receivedByUserId === me._id && balances[st.paidByUserId]) {
          balances[st.paidByUserId].owed = Math.max(
            0,
            balances[st.paidByUserId].owed - st.amount
          );
        }
      }

      const members = await Promise.all(
        Object.keys(balances).map((id) => ctx.db.get(id))
      );

      const list = Object.keys(balances).map((uid) => {
        const m = members.find((u) => u && u._id === uid);
        const { owed, owing } = balances[uid];
        return {
          userId: uid,
          name: m?.name || "Unknown",
          imageUrl: m?.imageUrl,
          youAreOwed: owed,
          youOwe: owing,
          netBalance: owed - owing,
        };
      });
      return {
        type: "group",
        group: {
          id: group._id,
          name: group.name,
          description: group.description,
        },
        balances: list,
      };
    } else {
      throw new Error("Invalid entityType; expected 'user' or 'group'");
    }
  },
});
