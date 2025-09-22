import { z } from "zod";
import { withParams } from "@/helpers/server/with_params";
import { ProfileMain } from "./main";

export default withParams(
  function Profile({ command, url }) {
    return <ProfileMain command={command?.[0]} url={url} />;
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
