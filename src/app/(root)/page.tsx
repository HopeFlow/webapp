import { getHopeflowDatabase } from "@/db";
import Onboarding from "./onboarding";
import { questTable } from "@/db/schema";

export default async function RootPage() {
  const db = await getHopeflowDatabase();
  const q = await db.select().from(questTable).limit(1);
  console.log(q);
  return <Onboarding />;
}
