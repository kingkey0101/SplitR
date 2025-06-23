"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { api } from "@/convex/_generated/api";
import { useConvexQuery } from "@/hooks/use-convex-query";
import { PlusCircleIcon } from "lucide-react";
import Link from "next/link";
import React from "react";
import { BarLoader } from "react-spinners";
import ExpenseSummary from "./componants/expense-summary";

const DashboardPage = () => {
  const { data: balances, isLoading: balancesLoading } = useConvexQuery(
    api.dashboard.getUserBalances
  );

  const { data: groups, isLoading: groupsLoading } = useConvexQuery(
    api.dashboard.getUserGroups
  );

  const { data: totalSpent, isLoading: totalSpentLoading } = useConvexQuery(
    api.dashboard.getTotalSpent
  );

  const { data: monthlySpending, isLoading: monthlySpendingLoading } =
    useConvexQuery(api.dashboard.getMonthlySpending);

  const isLoading =
    balancesLoading ||
    groupsLoading ||
    totalSpentLoading ||
    monthlySpendingLoading;

  return (
    <div>
      {isLoading ? (
        <div className="w-full py-12 flex justify-center">
          <BarLoader width={"100%"} color="#36d7b7" />
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <h1 className="text-5xl gradient-title">Dashboard</h1>

            <Button asChild>
              <Link href="/expenses/new">
                <PlusCircleIcon className="mr-2 h-4 w-4" />
                Add Expense
              </Link>
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Balance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {balances.totalBalance > 0 ? (
                    <span className="text-green-600">
                      +${balances?.totalBalance.toFixed(2)}
                    </span>
                  ) : balances?.totalBalance < 0 ? (
                    <span className="text-red-600">
                      -${Math.abs(balances?.totalBalance).toFixed(2)}
                    </span>
                  ) : (
                    <span>$0.00</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {balances?.totalBalance > 0
                    ? "You are owed money"
                    : balances?.totalBalance > 0
                      ? "You owe mone"
                      : "All settled up!"}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  You Are Owed
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  ${balances?.youAreOwed.toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  From {balances?.oweDetails?.youAreOwedBy?.length || 0} people
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  You Owe
                </CardTitle>
              </CardHeader>
              <CardContent>
                {balances?.oweDetails?.youOwe?.length > 0 ? (
                  <>
                    <div className="text-2xl font-bold text-red-600">
                      ${balances?.youOwe.toFixed(2)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      To {balances?.oweDetails?.youOwe?.length || 0} people
                    </p>
                  </>
                ) : (
                  <>
                    <div className="text-2xl font-bold">$0.00</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      You don't owe anyone
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* left column */}
            <div className="lg:col-span-2 space-y-6">
              {/* Expense Summary */}
              <ExpenseSummary />
            </div>
            {/* right column */}
            <div className="space-y-6">
              {/* Balance Details */}
              {/* Groups */}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default DashboardPage;
