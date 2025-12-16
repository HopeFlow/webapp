import Onboarding from "./onboarding";
import { publicPage, withUser } from "@/helpers/server/page_component";
import { redirectToHome } from "@/helpers/server/routes";

export default publicPage(
  withUser(async function RootPage({ user }) {
    if (user) redirectToHome();
    return <Onboarding />;
  }),
);
