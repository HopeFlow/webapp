"use server";
import { createCrudServerAction } from "@/helpers/server/create_server_action";

export const getQuests = createCrudServerAction({
  id: "getQuests",
  scope: "quest",
  read: async () => {
    return [
      {
        id: "1",
        title: "First Quest",
        description: "This is the first quest",
      },
      {
        id: "2",
        title: "Second Quest",
        description: "This is the second quest",
      },
    ];
  },
  create: async (data: { title: string; description: string }) => {
    console.log("Creating quest", data);
    return true;
  },
});

export const getQuestDetails = getQuests.createVariant(
  "getQuestDetails",
  async (id: string) => {
    console.log("Getting quest details for", id);
    return {
      id,
      title: "First Quest",
      description: "This is the first quest",
      details: "These are the details of the first quest",
    };
  },
);