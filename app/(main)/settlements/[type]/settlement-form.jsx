"use client";

import { api } from "@/convex/_generated/api";
import { useConvexMutation, useConvexQuery } from "@/hooks/use-convex-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

const { z } = require("zod");

//schema validation
const settlementSchema = z.object({
  amount: z
    .string()
    .min(1, "Amount is required")
    .refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
      message: "Amount must be a posivie number",
    }),
  note: z.string().optional(),
  paymentType: z.enum(["youPaid", "theyPaid"]),
});

export default function SettlementForm({ entityType, entityData, onSuccess }) {
  const { data: currentUser } = useConvexQuery(api.users.getCurrentUser);
  const createSettlement = useConvexMutation(api.settlements.createSettlement);

  //setup w/ form validation
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(settlementSchema),
    defaultValues: {
      amount: "",
      note: "",
      paymentType: "youPaid",
    },
  });

  //fetch selected payment direction
  const paymentType = watch("paymentType");

  //1-1 user settlement
  const handleUserSettlement = async (data) => {
    const amount = parseFloat(data.amount);

    try {
      //determine payer and receiver based on selected paymenttype(no groups)
      const paidByUserId =
        data.paymentType === "youPaid"
          ? currentUser._id
          : entityData.counterpart.userId;

      const receivedByUserId =
        data.paymentType === "youPaid"
          ? entityData.counterpart.userId
          : currentUser._id;

      await createSettlement.mutate({
        amount,
        note: data.note,
        paidByUserId,
        receivedByUserId,
      });

      toast.success("Settlement successfully recorded!");
      if (onSuccess) onSuccess();
    } catch (error) {
      toast.error("Failed to record settlement:" + error.message);
    }
  };

  //group settlement
  const handleGroupSettlement = async (data, selectedUserId) => {
    if (!selectedUserId) {
      toast.error("Please select a group member to settle with");
      return;
    }
    const amount = parseFloat(data.amount);
    try{
        //fetch selected user from group-balances
        const selectedUser = entityData.balances.find(
            (balance) => balance.userId === selectedUserId
        );

        if (!selectedUser){
            toast.error('Selected user not found in group');
            return;
        }

        //determine payer/receiver based on selected paument type and balances
        
    } 
  };
}
