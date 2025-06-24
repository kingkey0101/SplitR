"use client";

import { api } from "@/convex/_generated/api";
import { useConvexQuery } from "@/hooks/use-convex-query";
import { ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";

const GroupBalances = ({ balances }) => {
  const { data: currentUser } = useConvexQuery(api.users.getCurrentUser);

  if (!balances?.length || !currentUser) {
    return (
      <div className="text-center py-4 text-muted-foreground">
        No balance information available
      </div>
    );
  }

  //user balance for group
  const me = balances.find((b) => b.id === currentUser._id);

  if (!me) {
    return (
      <div className="text-center py-4 text-muted-foreground">
        You're not part of this group
      </div>
    );
  }
  //find user balances using .map()
  const userMap = Object.fromEntries(balances.map((b) => [b.id, b]));
  //checking who owes user
  const owedByMemebers = me.owedBy
    .map(({ from, amount }) => ({ ...userMap[from], amount }))
    .sort((a, b) => b.amount - a.amount);
  //checking who user owes
  const owingToMembers = me.owes
    .map(({ to, amount }) => ({ ...userMap[to], amount }))
    .sort((a, b) => b.amount - a.amount);

  const isAllSettledUp =
    me.totalBalance === 0 &&
    owedByMemebers.length === 0 &&
    owingToMembers.length === 0;

  return (
    <div className="space-y-4">
      <div className="text-center pb-4 border-b">
        <p className="text-sm text-muted-foreground mb-1">Your balance</p>
        <p
          className={`text-2xl font-bold ${
            me.totalBalance > 0
              ? "text-green-600"
              : me.totalBalance < 0
                ? "text-red-600"
                : ""
          }`}
        >
          {me.totalBalance > 0
            ? `+$${me.totalBalance.toFixed(2)}`
            : me.totalBalance < 0
              ? `-$${Math.abs(me.totalBalance).toFixed(2)}`
              : "$0.00"}
        </p>
      </div>
      {isAllSettledUp ? (
        <div className="text-center py-4">
          <p className="text-muted-foreground">Everyone is settled up!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {owedByMemebers.length && (
            <div>
              <h3 className="text-sm font-medium flex items-center mb-3">
                <ArrowUpCircle className="h-4 w-4 text-green-500 mr-2" />
                Owed to You
              </h3>
              <div className="space-y-3">
                {owedByMemebers.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={member.imageUrl} />
                        <AvatarFallback>
                          {member.name.charAt(0) ?? "?"}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm"> {member.name} </span>
                    </div>
                    {/* tells exact amount per individual user */}
                    <span className="font-medium text-green-600">
                      ${member.amount.toFixed(2)}
                    </span>
                  </div>
                ))}

                {owingToMembers.length && (
                  <div>
                    <h3 className="text-sm font-medium flex items-center mb-3">
                      <ArrowDownCircle className="h-4 w-4 text-red-500 mr-2" />
                      You owe
                    </h3>
                    <div className="space-y-3">
                      {owingToMembers.map((member) => (
                        <div
                          className="flex items-center justify-between"
                          key={member.id}
                        >
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={member.imageUrl} />
                              <AvatarFallback>
                                {member.name.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm"> {member.name} </span>
                          </div>
                          {/* tells exact amount per individual user */}
                          <span className="font-medium text-red-600">
                            ${member.amount.toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GroupBalances;
