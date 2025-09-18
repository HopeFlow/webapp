import { Sidebar } from "@/components/sidebar";
import { QuestStarterView } from "./starter";
import { QuestContributorView } from "./contributor";

export default async function QuestPage() {
  return (
    <div className="flex-1 w-full flex flex-row items-stretch">
      <Sidebar />
      <div className="flex-1 bg-base-200 relative overflow-scroll">
        <div className="absolute top-0 left-0 w-full flex flex-col items-center justify-center">
          <QuestContributorView />
        </div>
      </div>
    </div>
  );
}
