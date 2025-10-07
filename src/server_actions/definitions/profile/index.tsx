"use server";
import { createCrudServerAction } from "@/helpers/server/create_server_action";
import {
  ProfileRead,
  ProfileUpdateInput,
  readCurrentUserProfile,
  updateCurrentUserProfile,
} from "../common/profile";

export const userProfileCrud = createCrudServerAction({
  id: "Profile",
  scope: "profile",

  /**
   * READ — returns current user core fields + drizzle prefs (if any)
   */
  read: async (): Promise<ProfileRead> => readCurrentUserProfile(),

  /**
   * UPDATE
   */
  update: async (data: ProfileUpdateInput): Promise<boolean> =>
    updateCurrentUserProfile(data),
});
