// server_actions/definitions/profile/_core.ts
import { eq } from "drizzle-orm";
import { USER_PROFILE_DEFAULTS } from "@/helpers/client/constants";
import { getHopeflowDatabase } from "@/db";
import unidecode from "unidecode";
import { userProfileTable } from "@/db/schema";
import { transliterate } from "@/helpers/server/LLM";
import { clerkClientNoThrow, currentUserNoThrow } from "@/helpers/server/auth";
import { emailFrequencyDef } from "@/db/constants";

export type UserPreferences = {
  emailEnabled?: boolean;
  emailFrequency?: "immediate" | "daily" | "weekly";
  timezone?: string;
};

export function initializeProfileSettings(preferences: UserPreferences) {
  return {
    emailEnabled:
      preferences.emailEnabled ?? USER_PROFILE_DEFAULTS.emailEnabled,
    emailFrequency:
      preferences.emailFrequency ?? USER_PROFILE_DEFAULTS.emailFrequency,
    timezone: preferences.timezone || "UTC",
  };
}

const checkIfAscii = (str: string) => {
  for (let i = 0; i < str.length; i++) {
    if (str.charCodeAt(i) > 127) {
      return false;
    }
  }
  return true;
};

const checkIfLatin = (str: string) => {
  const latinRegex = /^[\u0000-\u024F\s\p{P}\p{S}]*$/u;
  return latinRegex.test(str);
};

/** Build asciiName from any "human" first name. */
export async function toAscii(firstNameRaw: string) {
  const firstName = (firstNameRaw || "").trim();
  if (!firstName) return "";
  if (checkIfAscii(firstName)) return firstName;
  return checkIfLatin(firstName)
    ? unidecode(firstName)
    : await transliterate(firstName);
}

/** Upsert user prefs + asciiName into drizzle table. */
export async function upsertUserProfile(
  userId: string,
  userPreferences: UserPreferences,
  firstNameRaw: string,
) {
  const db = await getHopeflowDatabase();
  const initializedProfile = initializeProfileSettings(userPreferences);
  const firstNameParts = firstNameRaw.split(" ");
  const firstNameAscii = await toAscii(firstNameParts[0] || "");

  const [row] = await db
    .select()
    .from(userProfileTable)
    .where(eq(userProfileTable.userId, userId))
    .limit(1);

  if (row) {
    await db
      .update(userProfileTable)
      .set({
        emailEnabled: initializedProfile.emailEnabled,
        emailFrequency: initializedProfile.emailFrequency,
        timezone: initializedProfile.timezone,
        asciiName: firstNameAscii,
      })
      .where(eq(userProfileTable.userId, userId));
  } else {
    await db.insert(userProfileTable).values({
      userId,
      emailEnabled: initializedProfile.emailEnabled,
      emailFrequency: initializedProfile.emailFrequency,
      timezone: initializedProfile.timezone,
      asciiName: firstNameAscii,
    });
  }
}

/** Ensure publicMetadata.userProfileCreated = true */
export async function ensureCreatedFlag(
  clerkUsers: { updateUserMetadata: (id: string, data: any) => Promise<any> },
  userId: string,
  already: unknown,
) {
  if (
    already &&
    (already as { userProfileCreated?: boolean })?.userProfileCreated
  )
    return;
  await clerkUsers.updateUserMetadata(userId, {
    publicMetadata: { userProfileCreated: true },
  });
}

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

export async function readCurrentUserProfile(): Promise<ProfileRead> {
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
}

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

export async function updateCurrentUserProfile(data: ProfileUpdateInput) {
  {
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
    const shouldUpdatePreferences =
      data.emailEnabled !== undefined ||
      data.emailFrequency !== undefined ||
      data.timezone !== undefined;

    if (shouldUpdatePreferences) {
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
  }
}
