"use server";
import { getHopeflowDatabase } from "@/db";
import { userProfileTable } from "@/db/schema";
import { createCrudServerAction } from "@/helpers/server/create_server_action";
import { eq } from "drizzle-orm";
import { clerkClientNoThrow, currentUserNoThrow } from "@/helpers/server/auth";
import { emailFrequencyDef } from "@/db/constants";
import { ensureCreatedFlag, upsertUserProfile } from "../common/profile";

/**
 * Shape returned to the client. Keep this lean for the create screen.
 */
export type ProfileRead =
  | { exists: false }
  | {
      exists: true;
      emailEnabled: boolean;
      emailFrequency: string;
      timezone: string;
      credence: string;
    };

/**
 * Payload accepted by update. Keep fields optional so UI can send only what changed.
 */
export interface ProfileUpdateInput {
  name?: string; // "FirstName LastName"
  photo?: File | null; // image file from client (can be null to skip)
  emailEnabled?: boolean;
  emailFrequency?: (typeof emailFrequencyDef)[number];
  timezone?: string;
}

function splitName(full?: string | null): {
  firstName?: string;
  lastName?: string;
} {
  if (!full || !full.trim()) return {};
  const m = /^(.*?)(?:\s(\S+))?$/.exec(full.trim());
  if (!m) return {};
  const [, firstName, lastName] = m as unknown as [
    string,
    string | undefined,
    string | undefined,
  ];
  return { firstName: firstName || undefined, lastName: lastName || undefined };
}

export const userProfileCrud = createCrudServerAction({
  id: "manageUserProfile",
  scope: "create_account",

  /**
   * READ — returns current user core fields + drizzle prefs (if any)
   */
  read: async (): Promise<ProfileRead> => {
    const user = await currentUserNoThrow();
    if (!user) return { exists: false };
    const db = await getHopeflowDatabase();
    const [row] = await db
      .select()
      .from(userProfileTable)
      .where(eq(userProfileTable.userId, user.id))
      .limit(1);
    if (!row) return { exists: false };
    const client = await clerkClientNoThrow();
    if (!client) {
      console.error("clerkClientNoThrow failed");
    } else {
      await ensureCreatedFlag(client!.users, user.id, user.publicMetadata);
    }
    return {
      exists: true,
      emailEnabled: row.emailEnabled,
      emailFrequency: row.emailFrequency,
      timezone: row.timezone,
      credence: row.credence,
    };
  },

  /**
   * UPDATE
   */
  update: async (data: ProfileUpdateInput): Promise<boolean> => {
    const user = await currentUserNoThrow();
    const client = await clerkClientNoThrow();
    if (!user || !client) return false;

    const users = client.users;

    // ── 1) write Clerk name/photo when provided
    let firstNameRaw = user.firstName || "";
    if (typeof data.name === "string") {
      const { firstName, lastName } = splitName(data.name);
      const updated = await users.updateUser(user.id, { firstName, lastName });
      const okName =
        (firstName === undefined || updated.firstName === firstName) &&
        (lastName === undefined || updated.lastName === lastName);
      if (!okName) return false;
      firstNameRaw = firstName || firstNameRaw;
    }

    if (data.photo instanceof File) {
      const updated = await users.updateUserProfileImage(user.id, {
        file: data.photo,
      });
      if (!updated.hasImage) return false;
    }

    // ── 2) Prefs (any of them provided) — delegate to shared upsert
    const wantsPrefsUpdate =
      data.emailEnabled !== undefined ||
      data.emailFrequency !== undefined ||
      data.timezone !== undefined;

    if (wantsPrefsUpdate) {
      await upsertUserProfile(
        user.id,
        {
          emailEnabled: data.emailEnabled,
          emailFrequency: data.emailFrequency as any,
          timezone: data.timezone,
        },
        firstNameRaw,
      );
    }

    // ── 3) Ensure metadata flag
    await ensureCreatedFlag(client.users, user.id, user.publicMetadata);

    return true;
  },
});
