import { withParams } from "@/helpers/server/with_params";
import { z } from "zod";
import Main from "./main";
import Email from "./email";

export default withParams(
  async function LoginPage({ url }) {
    return <Email url={url} />;
  },
  {
    searchParamsTypeDef: z.object({
      url: z.string().optional(),
    }),
  },
);
