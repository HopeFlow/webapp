import { publicPage, withParamsAndUser } from "@/helpers/server/page_component";
import { headers } from "next/headers";
import { isUserProfileCreated } from "@/server_actions/definitions/login/index.server";
import { X_CUR_URL_HEADER } from "@/helpers/server/constants";
import { z } from "zod";
import LoginGate from "./LoginGate";

export default publicPage(
  withParamsAndUser(
    async function LoginPage({ url, user }) {
      const headerList = await headers();
      const currentUrl =
        headerList.get(X_CUR_URL_HEADER) || "http://hopeflow.org/login";

      // Compute intentions on the server, but don’t switch the component tree here
      let intent:
        | "show-login"
        | "go-home"
        | "complete-oauth"
        | "finish-profile" = "show-login";

      if (user) {
        const created = await isUserProfileCreated(user.id);
        if (created) intent = "go-home";
        else if ((user.externalAccounts.length ?? 0) > 0)
          intent = "complete-oauth";
        else intent = "finish-profile";
      }

      return <LoginGate intent={intent} url={url} currentUrl={currentUrl} />;
    },
    { searchParamsTypeDef: z.object({ url: z.string().optional() }) },
  ),
);