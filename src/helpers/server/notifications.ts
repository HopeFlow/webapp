import { messageStatusDef, updateTypeDef } from "@/db/constants";

export type Notification = {
  id: string;
  timestamp: Date;
  status: (typeof messageStatusDef)[number];
  text: string;
  type: (typeof updateTypeDef)[number];
};

