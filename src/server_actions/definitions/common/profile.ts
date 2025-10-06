// server_actions/definitions/profile/_core.ts
import { eq } from "drizzle-orm";
import { USER_PROFILE_DEFAULTS } from "@/helpers/client/constants";
import { getHopeflowDatabase } from "@/db";
import unidecode from "unidecode";
import { userProfileTable } from "@/db/schema";
import { transliterate } from "@/helpers/server/LLM";

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
