import { withParams } from "@/helpers/server/with_params";
import { z } from "zod";
import Main from "./main";

export default withParams(
  async function LoginPage({ url }) {
    return <Main url={url} />;
  },
  {
    searchParamsTypeDef: z.object({
      url: z.string().optional(),
    }),
  },
);
