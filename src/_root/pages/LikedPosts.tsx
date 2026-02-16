import { GridPostList, Loader } from "@/components/shared";
import { useUserContext } from "@/context/AuthContext";
import { useGetLikedPosts } from "@/lib/react-query/queries";
const LikedPosts = () => {
  const { user } = useUserContext();

  // 1. Log the User ID to make sure it's not empty
  // console.log("Current User ID:", user.id);

  const { data: likedPosts, isLoading } = useGetLikedPosts(user.id);

  // 2. Log the result from Appwrite
  // if (likedPosts) console.log("Liked Posts Data:", likedPosts.documents);

  // Loading State
  if (isLoading)
    return (
      <div className="flex-center w-full h-full">
        <Loader />
      </div>
    );

  // Error/Empty State
  if (!likedPosts?.documents || likedPosts.documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full">
        <p className="text-light-4">No liked posts found</p>

        {/* Debugging Info (Visible on screen) */}
        <p className="text-xs text-dark-4 mt-2">
          Debug: User ID is {user.id ? "Present" : "Missing"}
        </p>
      </div>
    );
  }

  return (
    <>
      <GridPostList posts={likedPosts.documents} showStats={false} />
    </>
  );
};

export default LikedPosts;
