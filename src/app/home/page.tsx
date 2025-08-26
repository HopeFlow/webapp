import { Button } from "@/components/button";
import { PlusIcon } from "@/components/icons/plus";
import { MobileDock } from "@/components/mobile_dock";
import { MobileHeader } from "@/components/mobile_header";
import { Sidebar } from "@/components/sidebar";
import Image from "next/image";

export default async function Home() {
  return (
    <div className="flex-1 w-full flex flex-row items-stretch">
      <Sidebar />
      <div className="flex-1 bg-base-200 relative">
        <div className="absolute top-0 left-0 w-full h-full flex flex-col items-center justify-center">
          <MobileHeader />
          <div className="w-full p-8 flex-1 flex flex-col gap-12 items-center justify-center relative">
            <Image
              src="/img/row-boat.webp"
              alt="Row Boat"
              width={340}
              height={295}
              className="max-w-full h-auto object-contain"
            />
            <div>
              <h1 className="font-normal text-5xl mb-4">Start a quest ...</h1>
              <p className="font-thin max-w-80 md:max-w-xl">
                Your first quest awaits! With a little help from your friends
                and their friends, you’ll find doors opening that felt just out
                of reach — together, step by step.
              </p>
            </div>
            <div className="absolute bottom-4 right-4">
              <Button className="btn-circle">
                <PlusIcon />
              </Button>
            </div>
          </div>
          <MobileDock />
        </div>
      </div>
    </div>
  );
}
