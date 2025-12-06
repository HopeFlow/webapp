export const apiQueryEndpointKeys = [
  "common::readCurrentUserProfile",
  "createAccount::getCurrentUserProfile",
  "home::quests",
  "link::linkStatsCard",
  "link::readLinkTimeline",
  "link::readNodes",
  "profile::readCurrentUserProfile",
] as const;

export type ApiQueryEndpointKey = (typeof apiQueryEndpointKeys)[number];

export const apiMutationEndpointKeys = [
  "common::ensureCreatedFlag",
  "common::updateCurrentUserProfile",
  "common::upsertUserProfile",
  "createAccount::updateCurrentUserProfile",
  "createQuest::insertQuest",
  "link::addLinkTimelineComment",
  "link::addNode",
  "link::reactToLinkTimelineComment",
  "login::ensureOAuthProfileWithDefaults",
  "profile::updateCurrentUserProfile",
] as const;

export type ApiMutationEndpointKey = (typeof apiMutationEndpointKeys)[number];

export function createQueryKey(
  key: ApiQueryEndpointKey,
  ...rest: unknown[]
): readonly unknown[] {
  return [...key.split("::"), ...rest] as const;
}
