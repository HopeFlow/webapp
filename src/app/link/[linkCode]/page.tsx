import { z } from "zod";
import { withParams } from "@/helpers/server/with_params";
import { LinkMain } from "./main";

export default withParams(
  async function LinkPage({ linkCode }) {
    void linkCode;
    return <LinkMain />;
  },
  { paramsTypeDef: z.object({ linkCode: z.string() }) },
);
