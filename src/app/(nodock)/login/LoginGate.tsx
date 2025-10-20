"use client";

import { useEffect } from "react";
import { LoginMain } from "./main";
import { AutoCompleteOAuth } from "./autoCompleteOAuth";
import {
  useGoto,
  useGotoHome,
  useGotoCreateAccount,
} from "@/helpers/client/routes";
import SplashScreen from "@/app/splashScreen";

type Props = {
  intent: "show-login" | "go-home" | "complete-oauth" | "finish-profile";
  url?: string;
  currentUrl: string;
};

export default function LoginGate({ intent, url, currentUrl }: Props) {
  const goto = useGoto();
  const gotoHome = useGotoHome();
  const gotoCreateAccount = useGotoCreateAccount();

  // Do navigation in an effect to avoid changing hook layout during render
  useEffect(() => {
    if (intent === "go-home") {
      if (url && url.trim().length > 0) {
        goto(url);
      } else {
        gotoHome();
      }
    } else if (intent === "finish-profile") {
      gotoCreateAccount({ url });
    }
  }, [intent, url, goto, gotoHome, gotoCreateAccount]);

  // Stable render tree:
  // - For OAuth completion, render the tiny client that finalizes + redirects
  // - For login, show the login form
  // - For routes that immediately navigate, show a lightweight placeholder
  if (intent === "complete-oauth") {
    return <AutoCompleteOAuth url={url} />;
  }

  if (intent === "show-login") {
    return <LoginMain url={url} currentUrl={currentUrl} />;
  }

  // "go-home" and "finish-profile" — we’re navigating in an effect
  return <SplashScreen />;
}
