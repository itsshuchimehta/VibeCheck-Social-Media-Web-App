import { ID, Query } from "appwrite";

import { INewPost, INewUser, IUpdatePost, IUpdateUser } from "@/types";
import { account, appwriteConfig, avatars, databases, storage } from "./config";

// ============================================================
// AUTH
// ============================================================

// ============================== SIGN UP
export async function createUserAccount(user: INewUser) {
  try {
    const avatarUrl = avatars.getInitials(user.name);

    const newUser = await saveUserToDB({
      accountId: "newUID",
      name: user.name,
      email: user.email,
      username: user.username.toLowerCase(),
      imageUrl: avatarUrl,
    });

    if (newUser) {
      const newAccount = await account.create(
        ID.unique(),
        user.email,
        user.password,
        user.name,
      );
      if (!newAccount) throw Error;

      const updateNewUser = await databases.updateDocument(
        appwriteConfig.databaseId,
        appwriteConfig.userCollectionId,
        newUser.$id,
        {
          accountId: newAccount.$id,
        },
      );
      if (!updateNewUser) throw Error;
    }

    return newUser;
  } catch (error: any) {
    // console.log(error)
    if (error.type == "document_already_exists") {
      throw "Username/Email already Exists!";
    }
    throw error;
  }
}

// ============================== SAVE USER TO DB
export async function saveUserToDB(user: {
  accountId: string;
  email: string;
  name: string;
  imageUrl: URL;
  username?: string;
}) {
  try {
    const newUser = await databases.createDocument(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      ID.unique(),
      user,
    );

    return newUser;
  } catch (error) {
    console.log(error);
    // return error;
    throw error;
  }
}

// ============================== SIGN IN
export async function signInAccount(user: { email: string; password: string }) {
  try {
    const session = await account.createEmailSession(user.email, user.password);

    return session;
  } catch (error) {
    console.log(error);
  }
}

// ============================== GET ACCOUNT
export async function getAccount() {
  try {
    const currentAccount = await account.get();

    return currentAccount;
  } catch (error) {
    // console.log(error);
  }
}

// ============================== GET USER
export async function getCurrentUser() {
  try {
    const currentAccount = await getAccount();

    if (!currentAccount) throw Error;

    const currentUser = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      [Query.equal("accountId", currentAccount.$id)],
    );

    if (!currentUser) throw Error;

    return currentUser.documents[0];
  } catch (error) {
    // console.log(error);
    return null;
  }
}

// ============================== SIGN OUT
export async function signOutAccount() {
  try {
    const session = await account.deleteSession("current");

    return session;
  } catch (error) {
    console.log(error);
  }
}

// ============================================================
// POSTS
// ============================================================

// ============================== CREATE POST
export async function createPost(post: INewPost) {
  try {
    // Upload file to appwrite storage
    const uploadedFile = await uploadFile(post.file[0]);

    if (!uploadedFile) throw Error;

    // Get file url
    const fileUrl = getFilePreview(uploadedFile.$id);
    if (!fileUrl) {
      await deleteFile(uploadedFile.$id);
      throw Error;
    }

    // Convert tags into array
    // const tags = post.tags?.replace(/ /g, "").split(",") || [];
    const tags =
      post.tags && post.tags.trim()
        ? post.tags.replace(/ /g, "").split(",")
        : [];

    // Create post
    const newPost = await databases.createDocument(
      appwriteConfig.databaseId,
      appwriteConfig.postCollectionId,
      ID.unique(),
      {
        creator: post.userId,
        caption: post.caption,
        imageUrl: fileUrl,
        imageId: uploadedFile.$id,
        location: post.location?.trim() || "",
        tags: tags,
      },
    );

    if (!newPost) {
      await deleteFile(uploadedFile.$id);
      throw Error;
    }

    return newPost;
  } catch (error) {
    console.log(error);
  }
}

// ============================== UPLOAD FILE
export async function uploadFile(file: File) {
  try {
    const uploadedFile = await storage.createFile(
      appwriteConfig.storageId,
      ID.unique(),
      file,
    );

    return uploadedFile;
  } catch (error) {
    console.log(error);
  }
}

// ============================== GET FILE URL
export function getFilePreview(fileId: string) {
  try {
    // const fileUrl = storage.getFilePreview(
    //   appwriteConfig.storageId,
    //   fileId,
    //   2000,
    //   2000,
    //   "top",
    //   100
    // );
    // ⚠️ CHANGED: storage.getFilePreview -> storage.getFileView
    // This serves the original file (Bandwidth) instead of a resized one (Transformation)
    const fileUrl = storage.getFileView(appwriteConfig.storageId, fileId);

    if (!fileUrl) throw Error;

    return fileUrl;
  } catch (error) {
    console.log(error);
  }
}

// ============================== DELETE FILE
export async function deleteFile(fileId: string) {
  try {
    await storage.deleteFile(appwriteConfig.storageId, fileId);

    return { status: "ok" };
  } catch (error) {
    console.log(error);
  }
}

// ============================== GET POSTS
export async function searchPosts(searchTerm: string) {
  try {
    const posts = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.postCollectionId,
      [Query.search("caption", searchTerm)],
    );

    if (!posts) throw Error;

    return posts;
  } catch (error) {
    console.log(error);
  }
}

export async function getInfinitePosts({ pageParam }: { pageParam: number }) {
  const queries: any[] = [Query.orderDesc("$updatedAt"), Query.limit(9)];

  if (pageParam) {
    queries.push(Query.cursorAfter(pageParam.toString()));
  }

  try {
    const posts = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.postCollectionId,
      queries,
    );

    if (!posts) throw Error;

    return posts;
  } catch (error) {
    console.log(error);
  }
}

// ============================== GET POST BY ID
export async function getPostById(postId?: string) {
  if (!postId) throw Error;

  try {
    const post = await databases.getDocument(
      appwriteConfig.databaseId,
      appwriteConfig.postCollectionId,
      postId,
    );

    if (!post) throw Error;

    return post;
  } catch (error) {
    console.log(error);
  }
}

// ============================== UPDATE POST
export async function updatePost(post: IUpdatePost) {
  const hasFileToUpdate = post.file.length > 0;

  try {
    let image = {
      imageUrl: post.imageUrl,
      imageId: post.imageId,
    };

    if (hasFileToUpdate) {
      // Upload new file to appwrite storage
      const uploadedFile = await uploadFile(post.file[0]);
      if (!uploadedFile) throw Error;

      // Get new file url
      const fileUrl = getFilePreview(uploadedFile.$id);
      if (!fileUrl) {
        await deleteFile(uploadedFile.$id);
        throw Error;
      }

      image = { ...image, imageUrl: fileUrl, imageId: uploadedFile.$id };
    }

    // Convert tags into array
    // const tags = post.tags?.replace(/ /g, "").split(",") || [];
    const tags =
      post.tags && post.tags.trim()
        ? post.tags.replace(/ /g, "").split(",")
        : [];

    //  Update post
    const updatedPost = await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.postCollectionId,
      post.postId,
      {
        caption: post.caption,
        imageUrl: image.imageUrl,
        imageId: image.imageId,
        location: post.location?.trim() || "",
        tags: tags,
      },
    );

    // Failed to update
    if (!updatedPost) {
      // Delete new file that has been recently uploaded
      if (hasFileToUpdate) {
        await deleteFile(image.imageId);
      }

      // If no new file uploaded, just throw error
      throw Error;
    }

    // Safely delete old file after successful update
    if (hasFileToUpdate) {
      await deleteFile(post.imageId);
    }

    return updatedPost;
  } catch (error) {
    console.log(error);
  }
}

// ============================== DELETE POST
export async function deletePost(
  postId?: string,
  imageId?: string,
  saved?: any,
) {
  // console.log(saved)
  if (!postId || !imageId || !saved) return;
  // console.log(postId)

  try {
    // check if saved by anyone
    if (saved.length > 0) {
      for (const savedDocId of saved) {
        // console.log(savedDocId.$id)
        let savedbyUserdltStatus = await deleteSavedPost(savedDocId.$id);
        if (!savedbyUserdltStatus)
          throw new Error("Failed to delete saved post");
      }
    }

    const statusCode = await databases.deleteDocument(
      appwriteConfig.databaseId,
      appwriteConfig.postCollectionId,
      postId,
    );

    if (!statusCode) throw Error;

    await deleteFile(imageId);

    return { status: "Ok" };
  } catch (error) {
    console.log(error);
  }
}

// ============================== LIKE / UNLIKE POST
export async function likePost(postId: string, likesArray: string[]) {
  try {
    const updatedPost = await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.postCollectionId,
      postId,
      {
        likes: likesArray,
      },
    );

    if (!updatedPost) throw Error;

    return updatedPost;
  } catch (error) {
    console.log(error);
  }
}

// ============================== SAVE POST
export async function savePost(userId: string, postId: string) {
  try {
    const updatedPost = await databases.createDocument(
      appwriteConfig.databaseId,
      appwriteConfig.savesCollectionId,
      ID.unique(),
      {
        user: userId,
        post: postId,
      },
    );

    if (!updatedPost) throw Error;

    return updatedPost;
  } catch (error) {
    console.log(error);
  }
}
// ============================== DELETE SAVED POST
export async function deleteSavedPost(savedRecordId: string) {
  try {
    const statusCode = await databases.deleteDocument(
      appwriteConfig.databaseId,
      appwriteConfig.savesCollectionId,
      savedRecordId,
    );

    if (!statusCode) throw Error;

    return { status: "Ok" };
  } catch (error) {
    console.log(error);
  }
}

// ============================== GET USER'S POST
export async function getUserPosts(userId?: string) {
  if (!userId) return;

  try {
    const post = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.postCollectionId,
      [Query.equal("creator", userId), Query.orderDesc("$createdAt")],
    );

    if (!post) throw Error;

    return post;
  } catch (error) {
    console.log(error);
  }
}

// ============================== GET LIKED POSTS
export async function getLikedPosts(userId: string) {
  try {
    // 1. Fetch the User to get the list of Post IDs they liked
    const currentUser = await databases.getDocument(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      userId,
    );

    // Safety check: If user has no liked posts, return empty list immediately
    if (!currentUser || !currentUser.liked || currentUser.liked.length === 0) {
      return { documents: [] };
    }

    // 2. Extract the IDs of the liked posts
    const likedPostIds = currentUser.liked.map((post: any) => post.$id);

    // 3. Fetch the actual Posts using those IDs
    // This works because filtering by "$id" is always allowed
    const posts = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.postCollectionId,
      [Query.equal("$id", likedPostIds), Query.orderDesc("$createdAt")],
    );

    if (!posts) throw Error;

    return posts;
  } catch (error) {
    console.log(error);
    // ⚠️ CRITICAL FIX: Return empty object on error instead of undefined
    // This prevents the "Query data cannot be undefined" crash in React Query
    return { documents: [] };
  }
}

// ============================== GET POPULAR POSTS (BY HIGHEST LIKE COUNT)

export async function getRecentPosts() {
  try {
    // Get the current user
    const currentUser = await getCurrentUser();
    if (!currentUser) throw new Error("Current user not found");

    // Prepare a list of user IDs including the current user and the users they are following
    let userIdsToFetchPosts = currentUser.following || [];
    if (!userIdsToFetchPosts.includes(currentUser.$id)) {
      userIdsToFetchPosts.push(currentUser.$id);
    }

    // Fetch posts from the database for the specified user IDs
    const posts = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.postCollectionId,
      [Query.orderDesc("$createdAt"), Query.limit(20)],
    );

    // Filter posts to include only those whose creator is in the following set

    const filteredPosts = posts.documents.filter((post) =>
      userIdsToFetchPosts.includes(post.creator.$id),
    );

    posts.documents = filteredPosts;
    if (!posts || !posts.documents) throw new Error("Failed to retrieve posts");

    return posts;
  } catch (error) {
    console.error(error);
    throw error; // Rethrow the error for further handling
  }
}

// ============================================================
// USER
// ============================================================

// ============================== GET USERS
export async function getUsers(limit?: number) {
  const queries: any[] = [Query.orderDesc("$createdAt")];

  if (limit) {
    queries.push(Query.limit(limit));
  }

  try {
    // Add condition to exclude the current user ID
    const currentAccount = await getAccount();
    if (!currentAccount) throw Error;
    queries.push(Query.notEqual("accountId", currentAccount.$id));

    const users = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      queries,
    );

    if (!users) throw Error;
    return users;
  } catch (error) {
    console.log(error);
  }
}

// ============================== GET USER BY ID
export async function getUserById(userId: string) {
  try {
    const user = await databases.getDocument(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      userId,
    );

    if (!user) throw Error;

    return user;
  } catch (error) {
    console.log(error);
  }
}

// ============================== UPDATE USER
export async function updateUser(user: IUpdateUser) {
  const hasFileToUpdate = user.file.length > 0;
  try {
    let image = {
      imageUrl: user.imageUrl,
      imageId: user.imageId,
    };

    if (hasFileToUpdate) {
      // Upload new file to appwrite storage
      const uploadedFile = await uploadFile(user.file[0]);
      if (!uploadedFile) throw Error;

      // Get new file url
      const fileUrl = getFilePreview(uploadedFile.$id);
      if (!fileUrl) {
        await deleteFile(uploadedFile.$id);
        throw Error;
      }

      image = { ...image, imageUrl: fileUrl, imageId: uploadedFile.$id };
    }

    //  Update user
    const updatedUser = await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      user.userId,
      {
        name: user.name,
        username: user.username.toLowerCase(),
        bio: user.bio,
        imageUrl: image.imageUrl,
        imageId: image.imageId,
      },
    );

    // Failed to update
    if (!updatedUser) {
      // Delete new file that has been recently uploaded
      if (hasFileToUpdate) {
        await deleteFile(image.imageId);
      }
      // If no new file uploaded, just throw error
      throw Error;
    }

    // Safely delete old file after successful update
    if (user.imageId && hasFileToUpdate) {
      await deleteFile(user.imageId);
    }

    return updatedUser;
  } catch (error) {
    // console.log(error);
    throw error;
  }
}

// ============================== GET USERS BY SEARCH
export async function searchUsers(searchTerm: string) {
  try {
    const responseByName = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      [Query.search("name", searchTerm)],
    );
    const usersByName = responseByName.documents || []; // Adjust based on actual response structure

    const responseByUsername = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      [Query.search("username", searchTerm)],
    );

    const usersByUsername = responseByUsername.documents || []; // Adjust based on actual response structure

    // Combine the results, removing duplicates
    const combinedUsers = [...usersByName, ...usersByUsername].reduce<any[]>(
      (acc, user) => {
        if (!acc.some((u) => u.$id === user.$id)) {
          acc.push(user); // Add user if not already in the array
        }
        return acc;
      },
      [],
    );

    // Structure the final result
    const result = {
      total: combinedUsers.length,
      documents: combinedUsers,
    };

    if (!result.total) throw Error;

    // Return the structured result
    return result;
  } catch (error) {
    console.log(error);
  }
}

// ============================== UPDATE USER according to Following-UnFollowing action

// Create a global queue variable outside the function
let followQueue: Promise<any> = Promise.resolve();

export async function followUser(
  currentUserId: string,
  userIdToFollow: string,
) {
  // 2. Chain this request to the end of the queue
  const task = followQueue.then(async () => {
    try {
      // --- START OF LOGIC (Same as before) ---

      // Fetch FRESH data (Critical: happens after previous task finished)
      const currentUser = await databases.getDocument(
        appwriteConfig.databaseId,
        appwriteConfig.userCollectionId,
        currentUserId,
      );

      const targetUser = await databases.getDocument(
        appwriteConfig.databaseId,
        appwriteConfig.userCollectionId,
        userIdToFollow,
      );

      if (!currentUser || !targetUser) throw Error;

      let following = currentUser.following || [];
      let followers = targetUser.follower || [];

      // Toggle Following
      if (following.includes(userIdToFollow)) {
        following = following.filter((id: string) => id !== userIdToFollow);
      } else {
        following.push(userIdToFollow);
      }

      // Toggle Followers
      if (followers.includes(currentUserId)) {
        followers = followers.filter((id: string) => id !== currentUserId);
      } else {
        followers.push(currentUserId);
      }

      // Save updates
      const updatedCurrentUser = await databases.updateDocument(
        appwriteConfig.databaseId,
        appwriteConfig.userCollectionId,
        currentUserId,
        { following: following },
      );

      const updatedTargetUser = await databases.updateDocument(
        appwriteConfig.databaseId,
        appwriteConfig.userCollectionId,
        userIdToFollow,
        { follower: followers },
      );

      if (!updatedCurrentUser || !updatedTargetUser) throw Error;

      return updatedCurrentUser;
      // --- END OF LOGIC ---
    } catch (error) {
      console.log(error);
      throw error; // Pass error to the button
    }
  });

  // 3. Update the global queue pointer so the next click waits for this one
  // (We catch errors here so the queue doesn't get stuck if one fails)
  followQueue = task.catch((err) => console.error("Queue error:", err));

  // 4. Return the task so your UI can show Loading state
  return task;
}

export async function followedUser(
  userIdToFollow: string,
  followerArray: string[],
) {
  const currentFollower = followerArray;
  try {
    const updatedotherUser = await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      userIdToFollow,
      {
        follower: currentFollower,
      },
    );

    if (!updatedotherUser) throw Error;

    return updatedotherUser;
  } catch (error) {
    console.log(error);
    throw error;
  }
}

// Forget Passwords
export async function SendRecoveryLink(email: string) {
  try {
    const sendLink = await account.createRecovery(
      email,
      "https://vibe-check-sm.vercel.app/reset-password",
    );

    return sendLink;
  } catch (error: any) {
    throw error;
  }
}

// Reset Passwords
export async function ResetPassword(
  userId: string,
  secret: any,
  password: string,
) {
  try {
    const passwordUpdated = await account.updateRecovery(
      userId,
      secret,
      password,
      password,
    );

    return passwordUpdated;
  } catch (error) {
    throw error;
  }
}
