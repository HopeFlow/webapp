import { z } from "zod";
import { ProfileMain } from "./main";
import Prefetch, { withParamsAndUser } from "@/helpers/server/page_component";
import { user2SafeUser } from "@/helpers/server/auth";
import { redirectToHome } from "@/helpers/server/routes";
import { prefetchManageUserProfile } from "@/server_actions/client/profile/profile";
import { prefetchManageItems } from "@/server_actions/client/sample/manageItems";

const hasAlreadyCreatedProfile = async () => {};

export default withParamsAndUser(
  async function Profile({ command, url, user }) {
    if (!user) return null;
    const safeUser = user2SafeUser(user);

    // If the user has already created a profile and command is "create", redirect to the home page
    const isCreate = command?.[0] === "create";
    if (isCreate && (await hasAlreadyCreatedProfile())) redirectToHome();
    // Otherwise, render the profile page
    return (
      <Prefetch actions={[prefetchManageUserProfile()]}>
        <ProfileMain command={command?.[0]} url={url} user={safeUser} />
      </Prefetch>
    );
  },
  {
    paramsTypeDef: z.object({
      command: z.array(z.enum(["create"])).optional(),
    }),
    searchParamsTypeDef: z.object({
      url: z.string().url().optional(),
    }),
  },
);
