import { z } from "zod";
import { CreateAccountMain } from "./main";
import { withParamsAndUser } from "@/helpers/server/page_component";
import { user2SafeUser } from "@/helpers/server/auth";
import { redirectToHome } from "@/helpers/server/routes";
import { userProfileCrud } from "@/server_actions/definitions/profile";

const hasAlreadyCreatedProfile = async () => {
  const result = await userProfileCrud("read");
  return result.exists;
};

export default withParamsAndUser(
  async function createAccount({ url, user }) {
    if (!user) return null;
    const safeUser = user2SafeUser(user);

    // If the user has already created a profile and command is "create", redirect to the home page
    if (await hasAlreadyCreatedProfile()) redirectToHome();
    // Otherwise, render the profile page
    return <CreateAccountMain url={url} user={safeUser} />;
  },
  {
    searchParamsTypeDef: z.object({
      url: z.string().optional(),
    }),
  },
);
