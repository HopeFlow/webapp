"use server";

import {
  createCrudServerAction,
  createServerAction,
} from "@/helpers/server/create_server_action";
import { currentUserNoThrow, clerkClientNoThrow } from "@/helpers/server/auth";
import { upsertUserProfile, ensureCreatedFlag } from "../common/profile";

type EnsureOAuthInput = {
  timezone: string; // from browser
  emailEnabled?: boolean;
  emailFrequency?: "immediate" | "daily" | "weekly";
};

export const ensureOAuthProfileWithDefaults = createCrudServerAction({
  id: "ensureOAuthProfileWithDefaults",
  scope: "login",
  update: async (input: EnsureOAuthInput): Promise<boolean> => {
    const user = await currentUserNoThrow();
    const client = await clerkClientNoThrow();
    if (!user || !client) return false;

    // Use *existing* Clerk firstName as asciiName seed.
    const firstNameRaw = user.firstName || "";

    await upsertUserProfile(user.id, input, firstNameRaw);
    await ensureCreatedFlag(client.users, user.id, user.publicMetadata);

    return true;
  },
});
