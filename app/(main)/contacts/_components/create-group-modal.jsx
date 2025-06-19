import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import React from "react";
import { useForm } from "react-hook-form";
import {zodResolver} from '@hookform/resolvers/zod'
import { z } from "zod";

const groupSchema = z.object({
  name:z.string().min(1,'Group name is required'),
  descrption: z.string().optional(),
})

const CreateGroupModal = ({ isOpen, onClose, onSuccess }) => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm({
    resolver: zodResolver(groupSchema),
    defaultValues:{
      name:'',
      descrption:'',
    }
  });

  const handleClose = () => {
    //reset the form
    reset();
    onClose();
  };
  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Group</DialogTitle>
        </DialogHeader>

        <form action=""></form>

        <DialogFooter>Footer</DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreateGroupModal;
