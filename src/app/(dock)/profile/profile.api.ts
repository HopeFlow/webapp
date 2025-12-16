"use server";
import { createApiEndpoint } from "@/helpers/server/create_api_endpoint";
import {
  readCurrentUserProfile as readCurrentUserProfile__,
  updateCurrentUserProfile as updateCurrentUserProfile__,
} from "@/helpers/server/profile";

export const readCurrentUserProfile = createApiEndpoint({
  uniqueKey: "profile::readCurrentUserProfile",
  type: "query",
  handler: readCurrentUserProfile__,
});

export const updateCurrentUserProfile = createApiEndpoint({
  uniqueKey: "profile::updateCurrentUserProfile",
  type: "mutation",
  handler: updateCurrentUserProfile__,
});
