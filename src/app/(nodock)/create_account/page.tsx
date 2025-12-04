import { z } from "zod";
import { CreateAccountMain } from "./main";
import { publicPage, withParamsAndUser } from "@/helpers/server/page_component";
import { user2SafeUser } from "@/helpers/server/auth";
import { redirectToHome, redirectToLogin } from "@/helpers/server/routes";
import { readCurrentUserProfile } from "./create_account.api";

const hasAlreadyCreatedProfile = async () => {
  const result = await readCurrentUserProfile();
  return result.exists;
};

export default publicPage(
  withParamsAndUser(
    async function createAccount({ url, user }) {
      if (!user) {
        redirectToLogin({ url });
        return;
      }
      const safeUser = user2SafeUser(user);

      // If the user has already created a profile and command is "create", redirect to the home page
      if (await hasAlreadyCreatedProfile()) {
        redirectToHome();
      }
      // Otherwise, render the profile page
      return <CreateAccountMain url={url} user={safeUser} />;
    },
    { searchParamsTypeDef: z.object({ url: z.string().optional() }) },
  ),
);
