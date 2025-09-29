import { Sidebar } from "@/components/sidebar";
import { QuestStarterView } from "./starter";
import { QuestContributorView } from "./contributor";
import z from "zod";
import { withParams } from "@/helpers/server/page_component";

export default withParams(
  async function QuestPage({ questId }: { questId: string }) {
    return (
      <div className="flex-1 bg-base-200 relative overflow-scroll">
        <div className="absolute top-0 left-0 w-full flex flex-col items-center justify-center">
          {/* <QuestContributorView /> */}
          <QuestStarterView />
        </div>
      </div>
    );
  },
  {
    paramsTypeDef: z.object({ questId: z.string() }),
  },
);
