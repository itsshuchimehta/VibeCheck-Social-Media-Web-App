import { Models } from "appwrite";
import { Link } from "react-router-dom";

import FollowingButton from "./FollowingButton";

type UserCardProps = {
  user: Models.Document;
};

const UserCard = ({ user }: UserCardProps) => {
  return (
    <div className="user-card">
      <Link to={`/profile/${user.$id}`} className="flex-center flex-col gap-2">
        <img
          // src={user.imageUrl || "/assets/icons/profile-placeholder.svg"}
          src={
            user.imageUrl?.replace("/preview", "/view") ||
            "/assets/icons/profile-placeholder.svg"
          }
          alt="creator"
          className="rounded-full w-14 h-14"
        />

        <div className="flex-center flex-col gap-1">
          <p className="base-medium text-light-1 text-center line-clamp-1">
            {user.name}
          </p>
          <p className="small-regular text-light-3 text-center line-clamp-1">
            @{user.username}
          </p>
        </div>
      </Link>
      <FollowingButton userToFollow={user} userIdToFollow={`${user.$id}`} />
    </div>
  );
};

export default UserCard;
