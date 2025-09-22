import { withParams } from "@/helpers/server/with_params";
import { z } from "zod";
import { LoginMain } from "./main";

export default withParams(
  async function LoginPage({ url }) {
    return <LoginMain url={url} />;
  },
  {
    searchParamsTypeDef: z.object({
      url: z.string().optional(),
    }),
  },
);
