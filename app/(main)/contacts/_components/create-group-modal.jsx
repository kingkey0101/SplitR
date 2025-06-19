import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useConvexQuery } from "@/hooks/use-convex-query";
import { api } from "@/convex/_generated/api";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { UserPlus } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const groupSchema = z.object({
  name: z.string().min(1, "Group name is required"),
  descrption: z.string().optional(),
});

const CreateGroupModal = ({ isOpen, onClose, onSuccess }) => {
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [commandOpen, setCommandOpen] = useState(false);

  const { data: currentUser } = useConvexQuery(api.users.getCurrentUser);
  const { data: searchResults, isLoading: isSearching } = useConvexQuery(
    api.users.searchUsers,
    { query: searchQuery }
  );

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm({
    resolver: zodResolver(groupSchema),
    defaultValues: {
      name: "",
      descrption: "",
    },
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

        <form className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Group Name</Label>
            <Input
              id="name"
              placeholder="Enter group name here"
              {...register("name")}
            />
            {errors.name && (
              <p className="text-sm text-red-500">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              placeholder="Enter group description"
              {...register("descrption")}
            />
          </div>

          <div className="space-y-2">
            <Label>Members</Label>
            <div className="flex flex-wrap gap-2 mb-2">
              {currentUser && (
                <Badge variant="secondary" className="px-3 py-1">
                  <Avatar className="h-5 w-5 mr-2">
                    <AvatarImage src={currentUser.imageUrl} />
                    <AvatarFallback>
                      {currentUser.name?.charAt(0) || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <span>{currentUser.name} (You)</span>
                </Badge>
              )}

              {/* selected members */}

              {/* add user to selected members */}
              <Popover>
                <PopoverTrigger>
                  <Button type='button'
                  variant='outline'
                  size='sm'
                  className='h-8 gap-1 text-xs'
                  >
                    <UserPlus className="h-3.5 w-3.5"/>
                    Add member
                  </Button>
                </PopoverTrigger>
                <PopoverContent>
                  Place content for the popover here.
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </form>

        <DialogFooter>Footer</DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreateGroupModal;
