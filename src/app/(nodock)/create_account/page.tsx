import { z } from "zod";
import { CreateAccountMain } from "./main";
import Prefetch, { withParamsAndUser } from "@/helpers/server/page_component";
import { user2SafeUser } from "@/helpers/server/auth";
import { redirectToHome } from "@/helpers/server/routes";
import { prefetchManageUserProfile } from "@/server_actions/client/profile/profile";
import { prefetchManageItems } from "@/server_actions/client/sample/manageItems";

const hasAlreadyCreatedProfile = async () => false;

export default withParamsAndUser(
  async function createAccount({ url, user }) {
    if (!user) return null;
    const safeUser = user2SafeUser(user);

    // If the user has already created a profile and command is "create", redirect to the home page
    if (await hasAlreadyCreatedProfile()) redirectToHome();
    // Otherwise, render the profile page
    return (
      <Prefetch actions={[prefetchManageUserProfile()]}>
        <CreateAccountMain url={url} user={safeUser} />
      </Prefetch>
    );
  },
  {
    searchParamsTypeDef: z.object({
      url: z.string().url().optional(),
    }),
  },
);
