import { currentUser, type User } from "@clerk/nextjs/server";

export type SafeUser = {
  firstName: string | null;
  lastName: string | null;
  fullName: string | null;
  hasImage: boolean;
  accountCreated: boolean;
  imageUrl: string;
};

export const user2SafeUser = (user: User): SafeUser =>
  ({
    firstName: user.firstName,
    lastName: user.lastName,
    fullName: user.fullName,
    hasImage: user.hasImage,
    accountCreated: Boolean(user.publicMetadata.accountCreated),
    imageUrl: user.imageUrl,
  } as SafeUser);

export const currentUserNoThrow = async () => {
  try {
    return await currentUser();
  } catch {
    return undefined;
  }
};
