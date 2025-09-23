import { Sidebar } from "@/components/sidebar";
import { QuestStarterView } from "./starter";
import { MobileHeader } from "@/components/mobile_header";
import { withParams } from "@/helpers/server/with_params";
import z from "zod";

async function QuestPage({ questId }: { questId: string }) {
  return (
    <div className="flex-1 w-full flex flex-row items-stretch">
      <Sidebar />
      <div className="flex-1 bg-base-200 relative overflow-scroll">
        <div className="absolute top-0 left-0 w-full flex flex-col items-center justify-center">
          <QuestStarterView />
        </div>
      </div>
    </div>
  );
}

export default withParams(QuestPage, {
  paramsTypeDef: z.object({ questId: z.string() }),
});
