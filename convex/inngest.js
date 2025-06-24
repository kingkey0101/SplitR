import { query } from "./_generated/server";

export const getUsersWithOutstandingDebs = query({
  handler: async () => {
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
