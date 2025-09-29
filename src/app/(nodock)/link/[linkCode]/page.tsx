import { z } from "zod";
import { LinkMain } from "./main";
import { withParams } from "@/helpers/server/page_component";

export default withParams(
  async function LinkPage({ linkCode }) {
    void linkCode;
    return <LinkMain />;
  },
  { paramsTypeDef: z.object({ linkCode: z.string() }) },
);
