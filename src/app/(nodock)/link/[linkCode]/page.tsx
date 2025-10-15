import { z } from "zod";
import { LinkMain } from "./main";
import { withParamsAndUser } from "@/helpers/server/page_component";
import { user2SafeUser } from "@/helpers/server/auth";

export default withParamsAndUser(
  async function LinkPage({ linkCode, user }) {
    void linkCode;
    return <LinkMain user={user && user2SafeUser(user)} />;
  },
  { paramsTypeDef: z.object({ linkCode: z.string() }) },
);
