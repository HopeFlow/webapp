import { Button } from "@/components/button";
import { PlusIcon } from "@/components/icons/plus";
import Image from "next/image";

export function HomeMain() {
  return (
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
          Your first quest awaits! With a little help from your friends and
          their friends, you’ll find doors opening that felt just out of reach —
          together, step by step.
        </p>
      </div>
      <div className="absolute bottom-4 right-4">
        <Button className="btn-circle">
          <PlusIcon />
        </Button>
      </div>
    </div>
  );
}
