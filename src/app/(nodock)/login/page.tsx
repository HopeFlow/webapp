import { z } from "zod";
import { LoginMain } from "./main";
// import { redirectToHome, redirectToMatchedUrl } from "@/helpers/server/routes";
import { publicPage, withParamsAndUser } from "@/helpers/server/page_component";
import { headers } from "next/headers";
import { isUserProfileCreated } from "@/server_actions/definitions/login/index.server";
import {
  redirectTo,
  redirectToCreateAccount,
  redirectToHome,
} from "@/helpers/server/routes";
import { X_CUR_URL_HEADER } from "@/helpers/server/constants";
import { clerkClientNoThrow } from "@/helpers/server/auth";
import { AutoCompleteOAuth } from "./autoCompleteOAuth";
// import { AutoCompleteOAuth } from "./autoCompleteOAuth";
// import { clerkClientNoThrow } from "@/helpers/server/auth";

export default publicPage(
  withParamsAndUser(
    async function LoginPage({ url, user }) {
      const headerList = await headers();
      const currentUrl =
        headerList.get(X_CUR_URL_HEADER) || "http://hopeflow.org/login";

      if (user) {
        // If the user has already completed account creation
        const created = await isUserProfileCreated(user.id);
        if (created) {
          // Redirect to the specified `url` (e.g. the page the user was trying to access before login)
          if (url) return redirectTo(url);
          // Otherwise, redirect to the home page
          return redirectToHome();
        }

        // If not created yet, fast-path OAuth users
        const isOAuth = (user.externalAccounts.length ?? 0) > 0;

        if (isOAuth) {
          // Render the tiny client that completes profile (timezone + defaults) and redirects.
          return <AutoCompleteOAuth url={url} />;
        }

        // If the user hasn't finished account creation:
        if (url) {
          // Redirect them to the account creation flow, with the original URL passed through
          redirectToCreateAccount({ url });
        }

        // Redirect to the create account route without a `url` param since url was not provided
        redirectToCreateAccount({});
      }
      // If there is no user (not logged in), render the login page UI with optional `url` for redirecting later
      return <LoginMain url={url} currentUrl={currentUrl} />;
    },
    {
      searchParamsTypeDef: z.object({ url: z.string().optional() }),
    },
  ),
);
