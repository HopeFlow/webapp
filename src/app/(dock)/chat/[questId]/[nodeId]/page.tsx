import { z } from "zod";
import { withParams } from "@/helpers/server/page_component";
import { ChatMain } from "./main";

export default withParams(
  function Chat({ questId, nodeId }: { questId: string; nodeId: string }) {
    return <ChatMain questId={questId} nodeId={nodeId} />;
  },
  { paramsTypeDef: z.object({ questId: z.string(), nodeId: z.string() }) },
);
