"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { useUser } from "@clerk/nextjs";
import React, { useEffect, useState } from "react";

const SplitSelector = ({
  type,
  amount,
  participants,
  paidByUserId,
  onSplitsChange,
}) => {
  const { user } = useUser();

  const [splits, setSplits] = useState([]);
  const [totalPercentage, setTotalPercentage] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);

  useEffect(() => {
    if (!amount || amount <= 0 || participants.length === 0) {
      return;
    }

    let newSplits = [];

    if (type === "equal") {
      //equal splits
      const shareAmount = amount / participants.length;
      newSplits = participants.map((participant) => ({
        userId: participant.id,
        name: participant.name,
        email: participant.email,
        imageUrl: participant.imageUrl,
        amount: shareAmount,
        percentage: 100 / participants.length,
        paid: participant.id === paidByUserId,
      }));
    } else if (type === "percentage") {
      //initialize percentage splits evenly
      const evenPercentage = 100 / participants.length;
      newSplits = participants.map((participant) => ({
        userId: participant.id,
        name: participant.name,
        email: participant.email,
        imageUrl: participant.imageUrl,
        amount: (amount * evenPercentage) / 100,
        percentage: evenPercentage,
        paid: participant.id === paidByUserId,
      }));
    } else if (type === "exact") {
      //initalize exact splits evenly
      const evenAmount = amount / participants.length;
      newSplits = participants.map((participant) => ({
        userId: participant.id,
        name: participant.name,
        email: participant.email,
        imageUrl: participant.imageUrl,
        amount: evenAmount,
        percentage: (evenAmount / amount) * 100,
        paid: participant.id === paidByUserId,
      }));
    }

    setSplits(newSplits);
    //calc total
    const newTotalAmount = newSplits.reduce(
      (sum, split) => sum + split.amount,
      0
    );
    //calc percent
    const newTotalPercentage = newSplits.reduce(
      (sum, split) => sum + split.percentage
    );

    setTotalAmount(newTotalAmount);
    setTotalPercentage(newTotalPercentage);

    onSplitsChange(newSplits);
  }, [type, amount, participants, paidByUserId]);

  const updatePercentageSplit = (userId, newPercentage) => {
    //update user percentage and recalculate amount
    const updatedSplits = splits.map((split) => {
      if (split.userId === userId) {
        return {
          ...split,
          percentage: newPercentage,
          amount: (amount * newPercentage) / 100,
        };
      }
    });

    setSplits(updatedSplits);

    //recalc total
    const newTotalAmount = updatedSplits.reduce(
      (sum, split) => sum + split.amount,
      0
    );
    //recalc percent
    const newTotalPercentage = updatedSplits.reduce(
      (sum, split) => sum + split.percentage
    );

    setTotalAmount(newTotalAmount);
    setTotalPercentage(newTotalPercentage);

    //notify parent about split changes
    if (onSplitsChange) {
      onSplitsChange(updatedSplits);
    }
  };
  const updateExactSplit = (userId, newAmount) => {
    const parsedAmount = parseFloat(newAmount) || 0;

    //update users amount and recalc percentage
    const updatedSplits = splits.map((split) => {
      if (split.userId === userId) {
        return {
          ...split,
          amount: parsedAmount,
          percentage: amount > 0 ? (parsedAmount / amount) * 100 : 0,
        };
      }
      return split;
    });

    setSplits(updatedSplits);

    //recalc total
    const newTotalAmount = updatedSplits.reduce(
      (sum, split) => sum + split.amount,
      0
    );
    //recalc percent
    const newTotalPercentage = updatedSplits.reduce(
      (sum, split) => sum + split.percentage
    );

    setTotalAmount(newTotalAmount);
    setTotalPercentage(newTotalPercentage);

    //notify parent about split changes
    if (onSplitsChange) {
      onSplitsChange(updatedSplits);
    }

    onSplitsChange(newSplits);
  };

  //check if totals are valid
  const isPercentageValid = Math.abs(totalPercentage - 100) < 0.01;
  const isAmountValid = Math.abs(totalAmount - amount) < 0.01;

  return (
    <div>
      {splits.map((split) => (
        <div
          key={split.userId}
          className="flex items-center justify-between gap-4"
        >
          <div className="flex items-center gap-2 min-w-[120px]">
            <Avatar className="h-7 w-7">
              <AvatarImage src={split.imageUrl} />
              <AvatarFallback>{split.name?.charAt(0) || "?"}</AvatarFallback>
            </Avatar>
            <span className="text-sm">
              {split.userId === user?.id ? "You" : split.name}
            </span>
          </div>

          {type == "equal" && (
            <div className="text-right text-sm">
              ${split.amount.toFixed(2)} ({split.percentage.toFixed(1)}%)
            </div>
          )}

          {type === "percentage" && (
            <div className="flex items-center gap-4 flex-1">
              <Slider
                value={[split.percentage]}
                min={0}
                max={100}
                step={1}
                onValueChange={(values) =>
                  updatePercentageSplit(split.userId, values[0])
                }
                className="flex-1"
              />
              <div className="flex gap-1 items-center min-w-[100px]">
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={split.percentage.toFixed(1)}
                  onChange={(e) =>
                    updatePercentageSplit(
                      split.userId,
                      parseFloat(e.target.value) || 0
                    )
                  }
                  className="w-16 h-8"
                />
                <span className="text-sm text-muted-foreground">%</span>
                <span className="text-sm ml-1">${split.amount.toFixed(2)}</span>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default SplitSelector;
