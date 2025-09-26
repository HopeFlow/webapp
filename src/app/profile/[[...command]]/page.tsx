import { z } from "zod";
import { ProfileMain } from "./main";
import { withParamsAndUser } from "@/helpers/server/page_component";
import { user2SafeUser } from "@/helpers/server/auth";

export default withParamsAndUser(
  function Profile({ command, url, user }) {
    if (!user) return null;
    const safeUser = user2SafeUser(user);
    return <ProfileMain command={command?.[0]} url={url} user={safeUser} />;
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
