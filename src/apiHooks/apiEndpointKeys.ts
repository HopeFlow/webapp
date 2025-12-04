export const apiQueryEndpointKeys = [
  "common::readCurrentUserProfile",
  "createAccount::getCurrentUserProfile",
  "home::quests",
  "profile::readCurrentUserProfile",
] as const;

export type ApiQueryEndpointKey = (typeof apiQueryEndpointKeys)[number];

export const apiMutationEndpointKeys = [
  "common::ensureCreatedFlag",
  "common::updateCurrentUserProfile",
  "common::upsertUserProfile",
  "createAccount::updateCurrentUserProfile",
  "createQuest::insertQuest",
  "login::ensureOAuthProfileWithDefaults",
  "profile::updateCurrentUserProfile",
] as const;

export type ApiMutationEndpointKey = (typeof apiMutationEndpointKeys)[number];

export function createQueryKey(
  key: ApiQueryEndpointKey,
  variables: readonly unknown[],
): readonly unknown[] {
  return [key.split("::"), ...variables] as const;
}
