// login/auto_complete_oauth.tsx
"use client";

import { useEffect } from "react";
import { USER_PROFILE_DEFAULTS } from "@/helpers/client/constants";
import { useGoto, useGotoHome } from "@/helpers/client/routes";
import { getBrowserTimeZone } from "@/helpers/client/time";
import { useEnsureOAuthProfileWithDefaults } from "@/server_actions/client/login/ensureOAuthProfileWithDefaults";
import { LoadingElement } from "@/components/loading";

export function AutoCompleteOAuth({ url }: { url?: string }) {
  const goto = useGoto();
  const gotoHome = useGotoHome();
  const { update } = useEnsureOAuthProfileWithDefaults();

  useEffect(() => {
    (async () => {
      const timezone = getBrowserTimeZone();
      const ok = await update.mutateAsync({
        timezone,
        emailEnabled: USER_PROFILE_DEFAULTS.emailEnabled,
        emailFrequency: USER_PROFILE_DEFAULTS.emailFrequency,
      });
      console.log("AutoCompleteOAuth:", ok);
      if (url) goto(url);
      else gotoHome();
    })().catch(() => {
      console.log("AutoCompleteOAuth failed");
      if (url) goto(url);
      else gotoHome();
    });
  }, [goto, gotoHome, update, url]);

  return (
    <div className="w-full h-dvh flex items-center justify-center">
      <LoadingElement />
    </div>
  );
}
