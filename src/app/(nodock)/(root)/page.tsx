import { getHopeflowDatabase } from "@/db";
import Onboarding from "./onboarding";
import { questTable } from "@/db/schema";
import { publicPage, withUser } from "@/helpers/server/page_component";
import { redirectToHome } from "@/helpers/server/routes";

export default publicPage(
  withUser(async function RootPage({ user }) {
    // TODO: Remove these extra parts required to ensure DB file is created, ASAP
    const db = await getHopeflowDatabase();
    const q = await db.select().from(questTable).limit(1);
    console.log(q);
    if (user) redirectToHome();
    return <Onboarding />;
  }),
);
