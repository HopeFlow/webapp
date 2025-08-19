import { Button } from "@/components/button";
import { HopeflowLogo } from "@/components/logos/hopeflow";
import { GoogleLogo } from "@/components/logos/google";
import { FacebookLogo } from "@/components/logos/facebook";
import { EmailLogo } from "@/components/logos/email";
import { ArrowRight } from "@/components/icons/arrow_right";
import { withParams } from "@/helpers/server/with_params";
import { z } from "zod";

export default withParams(
  async function LoginPage({ url }) {
    console.log(url);
    return (
      <div className="w-full h-full flex flex-col gap-4 items-center justify-center">
        <div className="w-lg p-6 flex flex-col gap-4 card shadow-2xl bg-base-100">
          <div className="flex flex-col gap-4 items-center justify-center">
            <HopeflowLogo size={48} />
            <h1 className="font-normal text-4xl">Login or Signup</h1>
          </div>
          <Button buttonType="primary">
            <GoogleLogo /> Login/Signup with Google
          </Button>
          <Button buttonType="secondary">
            <FacebookLogo /> Login/Signup with Facebook
          </Button>
          <div className="divider">Or</div>
          <Button buttonType="neutral" buttonStyle="soft">
            <EmailLogo /> Login/Signup with Email <ArrowRight />
          </Button>
        </div>
      </div>
    );
  },
  {
    searchParamsTypeDef: z.object({
      url: z.string(),
    }),
  },
);
