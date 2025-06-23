import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import Link from "next/link";
import React from "react";

const BalanceSummary = ({ balances }) => {
  if (!balances) return null;

  const { oweDetails } = balances;

  const hasOwed = oweDetails.youAreOwedBy.length > 0;
  const hasOwing = oweDetails.youOwe.length > 0; //if both are false -> user is all settled up

  return (
    <div className="space-y-4">
      {/* no one owes user and user owes no one */}
      {!hasOwed && !hasOwing && (
        <div className="text-center py-6">
          <p className="text-muted-foreground">You're all settled up!</p>
        </div>
      )}

      {hasOwed && (
        <div>
          <h3 className="text-sm font-medium flex items-center mb-3">
            <ArrowUpCircle className="h-4 w-4 text-green-500 mr-2" />
            Owed to You
          </h3>
          <div className="space-y-3">
            {oweDetails.youAreOwedBy.map((item) => (
              <Link
                className="flex items-center justify-between hover:bg-muted p-2 rounded-md transition-colors"
                key={item.userId}
                href={`/person/${item.userId}`}
              >
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={item.imageUrl} />
                    <AvatarFallback>{item.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm"> {item.name} </span>
                </div>
                {/* tells exact amount per individual user */}
                <span className="font-medium text-green-600">
                  ${item.amount.toFixed(2)}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

       {hasOwing && (
        <div>
          <h3 className="text-sm font-medium flex items-center mb-3">
            <ArrowDownCircle className="h-4 w-4 text-red-500 mr-2" />
            You owe
          </h3>
          <div className="space-y-3">
            {oweDetails.youOwe.map((item) => (
              <Link
                className="flex items-center justify-between hover:bg-muted p-2 rounded-md transition-colors"
                key={item.userId}
                href={`/person/${item.userId}`}
              >
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={item.imageUrl} />
                    <AvatarFallback>{item.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm"> {item.name} </span>
                </div>
                {/* tells exact amount per individual user */}
                <span className="font-medium text-green-600">
                  ${item.amount.toFixed(2)}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default BalanceSummary;
