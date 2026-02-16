import { useFollowUser, useGetCurrentUser } from "@/lib/react-query/queries";
import { Models } from "appwrite";
import { useEffect, useState } from "react";
import { Button } from "../ui/button";

type FollowButtonProps = {
  userToFollow: Models.Document;
  userIdToFollow: string;
  onFollowChange?: (isFollowed: boolean) => void;
};

const FollowingButton = ({
  userIdToFollow,
  onFollowChange,
}: FollowButtonProps) => {
  const { data: currentUser } = useGetCurrentUser();
  // 1. Remove 'isLoading' - we don't want to know when it finishes
  const { mutate: followUser } = useFollowUser();

  const [isFollowing, setIsFollowing] = useState(false);

  useEffect(() => {
    // Sync initial state from DB
    if (currentUser) {
      // Safety check for null
      const following = currentUser.following || [];
      setIsFollowing(following.includes(userIdToFollow));
    }
  }, [currentUser, userIdToFollow]);

  const handleFollowUser = (
    e: React.MouseEvent<HTMLButtonElement, MouseEvent>,
  ) => {
    e.stopPropagation();

    if (!currentUser) return;

    // 2. Optimistic UI Update (Instant toggle)
    const newStatus = !isFollowing;
    setIsFollowing(newStatus);
    onFollowChange && onFollowChange(newStatus);

    // 3. Fire and Forget
    // The queue in api.ts ensures these execute in order (1->2->3)
    // We do NOT await this. We let it run in the background.
    followUser({
      currentUserId: currentUser.$id,
      userIdToFollow: userIdToFollow,
    });
  };

  return (
    <Button
      type="button"
      size="sm"
      className={`px-5 ${isFollowing ? "bg-dark-4" : "shad-button_primary"}`}
      onClick={handleFollowUser}
      // 4. CRITICAL: Never disable the button.
      // Allow the user to toggle 10 times if they want.
      // The queue will handle the 10 requests sequentially.
    >
      {isFollowing ? "Unfollow" : "Follow"}
    </Button>
  );
};

export default FollowingButton;
