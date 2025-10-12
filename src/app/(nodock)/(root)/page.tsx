import { getHopeflowDatabase } from "@/db";
import Onboarding from "./onboarding";
import { questTable } from "@/db/schema";

export default async function RootPage() {
  // TODO: Remove these extra parts required to ensure DB file is created, ASAP
  const db = await getHopeflowDatabase();
  const q = await db.select().from(questTable).limit(1);
  console.log(q);
  return <Onboarding />;
}
