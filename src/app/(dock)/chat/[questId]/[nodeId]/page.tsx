import { z } from "zod";
import { withParams } from "@/helpers/server/page_component";
import { ChatMain } from "./main";
import { initializeChatRoom } from "@/helpers/server/realtime";

export default withParams(
  async function Chat({
    questId,
    nodeId,
  }: {
    questId: string;
    nodeId: string;
  }) {
    const initialData = await initializeChatRoom(questId, nodeId);
    return (
      <ChatMain questId={questId} nodeId={nodeId} initialData={initialData} />
    );
  },
  { paramsTypeDef: z.object({ questId: z.string(), nodeId: z.string() }) },
);
