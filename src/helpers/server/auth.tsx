import { clerkClient, currentUser, type User } from "@clerk/nextjs/server";

export type SafeUser = {
  firstName: string | null;
  lastName: string | null;
  fullName: string | null;
  hasImage: boolean;
  imageUrl: string;
};

export const user2SafeUser = (user: User): SafeUser =>
  ({
    firstName: user.firstName,
    lastName: user.lastName,
    fullName: user.fullName,
    hasImage: user.hasImage,
    userProfileCreated: Boolean(user.publicMetadata.userProfileCreated),
    imageUrl: user.imageUrl,
  }) as SafeUser;

export const currentUserNoThrow = async () => {
  try {
    return await currentUser();
  } catch {
    return undefined;
  }
};

export const clerkClientNoThrow = async () => {
  try {
    return await clerkClient();
  } catch {
    return undefined;
  }
};
