"use server";
import { getHopeflowDatabase } from "@/db";
import { userProfileTable } from "@/db/schema";
import { createCrudServerAction } from "@/helpers/server/create_server_action";
import { eq } from "drizzle-orm";
import {
  clerkClientNoThrow,
  currentUserNoThrow,
  SafeUser,
} from "@/helpers/server/auth";
import { emailFrequencyDef } from "@/db/constants";

/**
 * Shape returned to the client. Keep this lean for the create screen.
 */
export interface ProfileRead extends SafeUser {
  emailEnabled?: boolean;
  emailFrequency?: string | null;
  timezone?: string | null;
}

/**
 * Payload accepted by update. Keep fields optional so UI can send only what changed.
 */
export interface ProfileUpdateInput {
  name?: string; // "First Last"
  photo?: File | null; // image file from client (can be null to skip)
  emailEnabled?: boolean;
  emailFrequency?: (typeof emailFrequencyDef)[number];
  timezone?: string | null;
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

export const profile = createCrudServerAction({
  id: "manageUserProfile",
  scope: "profile",

  /**
   * READ — returns current user core fields + drizzle prefs (if any)
   */
  read: async (): Promise<ProfileRead | undefined> => {
    const user = await currentUserNoThrow();
    if (!user) return undefined;
    const db = await getHopeflowDatabase();
    const [row] = await db
      .select()
      .from(userProfileTable)
      .where(eq(userProfileTable.userId, user.id))
      .limit(1);

    return {
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: user.fullName,
      imageUrl: user.imageUrl ?? undefined,
      hasImage: user.hasImage ?? undefined,
      emailEnabled: row?.emailEnabled ?? undefined,
      emailFrequency: row?.emailFrequency ?? undefined,
      timezone: row?.timezone ?? undefined,
    };
  },

  /**
   * UPDATE
   */
  update: async (
    data: ProfileUpdateInput,
    insertIfNotExist: boolean = true,
  ): Promise<boolean> => {
    const user = await currentUserNoThrow();
    const client = await clerkClientNoThrow();
    if (!user || !client) return false;

    const db = await getHopeflowDatabase();
    const users = client.users;

    // Clerk: name ───────────────────────────────────────────────────────────
    if (typeof data.name === "string") {
      const { firstName, lastName } = splitName(data.name);
      const updated = await users.updateUser(user.id, { firstName, lastName });
      const okName =
        (firstName === undefined || updated.firstName === firstName) &&
        (lastName === undefined || updated.lastName === lastName);
      if (!okName) return false;
    }

    // Clerk: photo ──────────────────────────────────────────────────────────
    if (data.photo instanceof File) {
      const updated = await users.updateUserProfileImage(user.id, {
        file: data.photo,
      });
      if (!updated.hasImage) return false;
    }

    // Drizzle: prefs upsert/update (only if any prefs present)
    const wantsPrefsUpdate =
      data.emailEnabled !== undefined ||
      data.emailFrequency !== undefined ||
      data.timezone !== undefined;

    if (!wantsPrefsUpdate) return true;

    // Build partial values without undefineds
    const setValues: Partial<typeof userProfileTable.$inferInsert> = {};
    if (data.emailEnabled !== undefined)
      setValues.emailEnabled = data.emailEnabled;
    if (data.emailFrequency !== undefined)
      setValues.emailFrequency = data.emailFrequency;
    if (data.timezone !== undefined) setValues.timezone = data.timezone ?? null;

    if (insertIfNotExist) {
      // Preferred: single round-trip UPSERT
      await db
        .insert(userProfileTable)
        .values({ userId: user.id, ...setValues })
        .onConflictDoUpdate({
          target: userProfileTable.userId,
          set: setValues,
        });
      return true;
    }

    // Otherwise, do a strict UPDATE only and report if nothing changed
    const upd = await db
      .update(userProfileTable)
      .set(setValues)
      .where(eq(userProfileTable.userId, user.id));

    // Drizzle returns driver-specific metadata; try common shapes safely
    const rowsAffected =
      (upd as unknown as { rowsAffected?: number })?.rowsAffected ??
      (upd as unknown as { changes?: number })?.changes ??
      0;

    return rowsAffected > 0;
  },
});
