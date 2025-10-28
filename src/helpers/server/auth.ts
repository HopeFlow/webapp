import {
  auth,
  clerkClient,
  currentUser,
  type User,
} from "@clerk/nextjs/server";
import { decodeJwtToken, encodeJwtToken } from "./jwt";
import { cookies } from "next/headers";
import { linkTable } from "@/db/schema";
import { getHopeflowDatabase } from "@/db";
import { eq } from "drizzle-orm";

export type SafeUser = {
  firstName: string | null;
  lastName: string | null;
  fullName: string | null;
  hasImage: boolean;
  imageUrl: string;
};

/**
 * Projects a Clerk user into a limited shape that is safe to expose to clients.
 */
export const user2SafeUser = (user: User): SafeUser =>
  ({
    firstName: user.firstName,
    lastName: user.lastName,
    fullName: user.fullName,
    hasImage: user.hasImage,
    userProfileCreated: Boolean(user.publicMetadata.userProfileCreated),
    imageUrl: user.imageUrl,
  }) as SafeUser;

/**
 * Wraps `currentUser` so callers can handle unauthenticated requests without exceptions.
 */
export const currentUserNoThrow = async () => {
  try {
    return await currentUser();
  } catch {
    return undefined;
  }
};

/**
 * Retrieves the Clerk client if available, returning `undefined` instead of throwing.
 */
export const clerkClientNoThrow = async () => {
  try {
    return await clerkClient();
  } catch {
    return undefined;
  }
};

const jwtPublicKey = Buffer.from(
  process.env.JWT_PUBLIC_KEY || "",
  "base64",
).toString("ascii");

const chatPrivateKey = Buffer.from(
  process.env.CHAT_PRIVATE_KEY || "",
  "base64",
).toString("ascii");

const chatPublicKey = Buffer.from(
  process.env.CHAT_PUBLIC_KEY || "",
  "base64",
).toString("ascii");

const testPublicKey = Buffer.from(
  process.env.TEST_PUBLIC_KEY || "",
  "base64",
).toString("ascii");

/**
 * Retrieves the active Clerk session JWT if present, otherwise returns `null`.
 */
export const getJwtToken = async () => {
  try {
    return (await auth()).getToken();
  } catch {
    return null;
  }
};

export const deactivateLinkAndSetJwtToken = async (linkCode: string) => {
  const db = await getHopeflowDatabase();
  const linkEntry = await db.query.linkTable.findFirst({
    where: eq(linkTable.linkCode, linkCode),
    with: { quest: { columns: { type: true } } },
  });
  if (!linkEntry) return false;
  if (linkEntry.quest.type === "unrestricted") {
    console.warn(
      `deactivateLinkAndSetJwtToken: the link(${linkEntry.id}) corresponds to a public quest`,
    );
    return false;
  }
  if (!linkEntry.active) {
    console.warn(
      `deactivateLinkAndSetJwtToken: the link(${linkEntry.id}) has already been deactivated`,
    );
    return true;
  }

  const [updatedLink] = await db
    .update(linkTable)
    .set({ active: false })
    .where(eq(linkTable.id, linkEntry.id))
    .returning();
  if (!updatedLink) return false;
  if (updatedLink.active) return false;
  const c = await cookies();
  const jwtToken = encodeJwtToken({ linkCode }, chatPrivateKey);
  c.set("linkJwtToken", jwtToken, {
    path: `/link/${linkCode}`,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  });
  return true;
};

/**
 * Confirms that the JWT stored in the `linkJwtToken` cookie matches the provided link record.
 */
export async function verifyLinkJwtToken<
  T extends typeof linkTable.$inferSelect,
>(l: T) {
  "server only";
  const c = await cookies();
  const jwtToken = c.get("linkJwtToken")?.value;
  if (!jwtToken) return false;
  try {
    const decoded = decodeJwtToken(jwtToken, chatPublicKey);
    if (!decoded.linkCode) return false;
    if (l.linkCode !== decoded.linkCode) return false;
    return true;
  } catch {
    return false;
  }
}

/**
 * Fetches Clerk users in batches, handling pagination limits under the hood.
 */
const getUserList = async (userIds: Set<string>) => {
  const client = await clerkClientNoThrow();
  if (!client) throw new Error("Authorization is required");
  const usersApi = client.users;
  const userIdArray = Array.from(userIds);
  return (
    await Promise.all(
      Array.from({ length: Math.ceil(userIds.size / 100) }, (_, i) =>
        userIdArray.slice(i * 100, (i + 1) * 100),
      ).map(async (c) => {
        const { data, totalCount } = await usersApi.getUserList({
          userId: c,
          limit: 500,
        });
        while (data.length < totalCount) {
          const page = await usersApi.getUserList({
            userId: c,
            offset: data.length,
            limit: 500,
          });
          data.push(...page.data);
        }
        return data;
      }),
    )
  ).flatMap((e) => e);
};

export type RequestedFields<T> = T extends undefined
  ? { [k: string]: true | string }
  : Partial<{ [k in keyof T]: true | string }>;

export type RequestedObject<
  T = unknown,
  U extends RequestedFields<T> = RequestedFields<T>,
> = T extends undefined
  ? {
      [k in keyof U as U[k] extends string ? U[k] : k]: k extends keyof T
        ? null
        : never;
    }
  : {
      [k in keyof U as U[k] extends string ? U[k] : k]: k extends keyof T
        ? T[k]
        : never;
    };

/**
 * Typed `Object.keys` that preserves the specific key types.
 */
export const keysOf = <T extends object>(o: T): (keyof T)[] =>
  Object.keys(o) as (keyof T)[];

/**
 * Materializes the shape described by a `RequestedFields` map. If a source object is supplied,
 * values are copied from it; otherwise `null` placeholders are returned so consumers know which
 * keys they can expect.
 *
 * Example:
 * const requested = { firstName: true, lastName: "surname" };
 * const user = { firstName: "Ada", lastName: "Lovelace" };
 * requestedFields(requested, user);
 * // => { firstName: "Ada", surname: "Lovelace" }
 *
 * requestedFields(requested);
 * // => { firstName: null, surname: null }
 */
export const requestedFields = <
  T = undefined,
  U extends RequestedFields<T> = RequestedFields<T>,
>(
  r: U,
  o?: T,
) =>
  (!o
    ? Object.fromEntries(keysOf(r).map((k) => [r[k] === true ? k : r[k], null]))
    : Object.fromEntries(
        keysOf(r).map((k) => [r[k] === true ? k : r[k], o[k as keyof T]]),
      )) as RequestedObject<T, U>;

export type WithRequestedFields<
  S,
  T = unknown,
  U extends RequestedFields<T> = RequestedFields<T>,
> = S & RequestedObject<T, U>;

export type WithRequestedFieldsMaybeArray<
  S,
  Ss extends S | S[],
  T = unknown,
  U extends RequestedFields<T> = RequestedFields<T>,
> =
  Ss extends Array<infer E>
    ? WithRequestedFields<E, T, U>[]
    : Ss extends S
      ? WithRequestedFields<Ss, T, U>
      : never;

/**
 * Attaches arbitrary data (defined by the requested fields map) onto either a single entity or an array.
 * Pass a transformer that converts the base entity into the object the fields should be read from.
 *
 * Example:
 * const posts = [{ id: "1", userId: "u1" }];
 * const users = new Map([["u1", { firstName: "Ada", lastName: "Lovelace" }]]);
 * const enriched = withRequestedFields(
 *   posts,
 *   { firstName: true, lastName: "surname" },
 *   (post) => users.get(post.userId ?? ""),
 * );
 * // => [{ id: "1", userId: "u1", firstName: "Ada", surname: "Lovelace" }]
 */
export const withRequestedFields = <
  S,
  Ss extends S | S[],
  T = undefined,
  U extends RequestedFields<T> = RequestedFields<T>,
>(
  a: Ss,
  userRequestedFields: U,
  s2T: (s: S) => T | undefined,
): WithRequestedFieldsMaybeArray<S, Ss, T, U> => {
  const convert = (e: S, u?: T) =>
    ({
      ...e,
      ...requestedFields(userRequestedFields, u),
    }) as WithRequestedFields<S, T, U>;

  const isNotArray = (v: Ss): v is Extract<Ss, S> => !Array.isArray(v);

  if (isNotArray(a))
    return convert(a, s2T(a)) as WithRequestedFieldsMaybeArray<S, Ss, T, U>;

  return (a as S[]).map((v) =>
    convert(v, s2T(v)),
  ) as WithRequestedFieldsMaybeArray<S, Ss, T, U>;
};

export type RequestedUserFields = RequestedFields<User>;

export type WithUserData<
  T extends { userId: string | null },
  U extends RequestedUserFields,
> = WithRequestedFields<T, User, U>;

type WithUserDataMaybeArray<
  T extends { userId: string | null },
  Ts extends T | T[],
  U extends RequestedUserFields,
> = WithRequestedFieldsMaybeArray<T, Ts, User, U>;

/**
 * Enriches an object or array of objects that have a `userId` field
 * with corresponding user data, based on the requested user fields.
 *
 * This is useful when you have resources (e.g. posts, comments) with
 * only a `userId`, and you want to attach partial user info (like name, avatar, etc).
 *
 * Example usage:
 *
 * const posts = [
 *   { id: "1", title: "First Post", userId: "user_123" },
 *   { id: "2", title: "Second Post", userId: "user_456" },
 * ];
 *
 * const enrichedPosts = await withUserData(posts, {"name": true, "avatarUrl": "myAvatarUrl"});
 *
 * Result (assuming getUserList returns user data with these fields):
 * [
 *   {
 *     id: "1",
 *     title: "First Post",
 *     userId: "user_123",
 *     name: "Alice",
 *     myAvatarUrl: "https://..."
 *   },
 *   {
 *     id: "2",
 *     title: "Second Post",
 *     userId: "user_456",
 *     name: "Bob",
 *     myAvatarUrl: "https://..."
 *   }
 * ]
 *
 * @param a - A single object or array of objects containing a `userId` field.
 * @param userRequestedFields - Fields to include from the user object.
 * @returns The same structure as input, with additional user data included.
 */

export const withUserData = async <
  T extends { userId: string | null },
  Ts extends T | T[],
  U extends RequestedUserFields,
>(
  a: Ts,
  userRequestedFields: U,
): Promise<WithUserDataMaybeArray<T, Ts, U>> => {
  const users = new Map(
    (
      await getUserList(
        new Set((a as T[]).map((e) => e.userId).filter((e) => e !== null)),
      )
    ).map((u) => [u.id, u]),
  );
  return withRequestedFields(a, userRequestedFields, (aa: T) =>
    aa.userId ? users.get(aa.userId) : undefined,
  );
};

const withUserImageUrlField = { imageUrl: "userImageUrl" } as const;
export type WithUserImageUrl<T extends { userId: string | null }> =
  WithUserData<T, typeof withUserImageUrlField>;

/**
 * Shortcut for augmenting records with just the user's profile image URL.
 */
export const withUserImageUrl = async <
  T extends { userId: string | null },
  Ts extends T | T[],
>(
  a: Ts,
) => withUserData(a, withUserImageUrlField);

/**
 * Convenience helper to fetch a user's image URL via Clerk, returning `null` if unavailable.
 */
export const getUserImageUrl = async (userId: string) => {
  const client = await clerkClientNoThrow();
  if (!client) return null;
  const user = await client.users.getUser(userId);
  return user.imageUrl;
};
