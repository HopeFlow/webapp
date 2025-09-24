import { Button, GhostButton } from "@/components/button";
import { ArrowRightIcon } from "@/components/icons/arrow_right";
import { PlusIcon } from "@/components/icons/plus";
import { MobileDock } from "@/components/mobile_dock";
import { MobileHeader } from "@/components/mobile_header";
import { Sidebar } from "@/components/sidebar";
import Image from "next/image";

export default function Notifications() {
  return (
    <div className="flex-1 w-full flex flex-row items-stretch">
      <Sidebar />
      <div className="flex-1 bg-base-200 relative">
        <div className="absolute top-0 left-0 w-full h-full flex flex-col items-center justify-center">
          <MobileHeader />
          <div className="w-full p-8 flex-1 min-h-full overflow-auto">
            <div className="flex flex-col gap-12 items-center justify-center">
              {new Array(7).fill(null).map((_, i) => (
                <div
                  key={`n-${i}`}
                  className="card p-8 bg-base-100 border border-base-content/30 w-full md:h-48 flex-shrink-0 flex flex-col md:flex-row gap-4"
                >
                  <div className="flex-shrink-0 h-32 md:w-auto md:h-full overflow-hidden flex flex-col items-center justify-center">
                    <Image
                      src="https://pub-7027dcead7294deeacde6da1a50ed32f.r2.dev/trek-520-grando-51cm-v0.jpeg"
                      alt="Row Boat"
                      width={2016}
                      height={1512}
                      className="max-w-full h-auto md:w-auto md:max-h-full object-contain rounded-box"
                    />
                  </div>
                  <div className="flex-shrink-0 md:flex-1 flex flex-col">
                    <h1 className="font-bold">Chat message from Jacob</h1>
                    <h2 className="text-sm mb-4">
                      from <i>"Help Jacob find his stolen bicycle"</i>
                    </h2>
                    <div className="flex-1"></div>
                    <p>I think what you found is actually my bicycle</p>
                  </div>
                  <div>
                    <Button buttonType="neutral" buttonStyle="soft">
                      See the chat <ArrowRightIcon />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <MobileDock />
        </div>
      </div>
    </div>
  );
}
