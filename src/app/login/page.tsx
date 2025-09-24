import { z } from "zod";
import { LoginMain } from "./main";
import { redirectToHome, redirectToMatchedUrl } from "@/helpers/server/routes";
import { publicPage, withParamsAndUser } from "@/helpers/server/page_component";

export default publicPage(
  withParamsAndUser(
    async function LoginPage({ url, user }) {
      if (user) {
        // If the user has already completed account creation
        if (user.accountCreated) {
          // Redirect to the specified `url` (e.g. the page the user was trying to access before login)
          if (url) return redirectToMatchedUrl(url);
          // Otherwise, redirect to the home page
          return redirectToHome();
        }

        // If the user hasn't finished account creation:
        if (url) {
          // Redirect them to the account creation flow, with the original URL passed through
          // return routeSpecs.createAccount.redirectTo({ url });
        }

        // Redirect to the create account route without a `url` param since url was not provided
        // return routeSpecs.createAccount.redirectTo();
      }
      // If there is no user (not logged in), render the login page UI with optional `url` for redirecting later
      return <LoginMain url={url} />;
    },
    {
      searchParamsTypeDef: z.object({ url: z.string().optional() }),
    },
  ),
);
