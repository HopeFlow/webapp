import { Button } from "@/components/button";
import { PlusIcon } from "@/components/icons/plus";
import { useGotoCreateQuest } from "@/helpers/client/routes";
import Image from "next/image";

export function HomeMain() {
  const gotoCreateQuest = useGotoCreateQuest();
  return (
    <div className="relative flex w-full flex-1 flex-col items-center justify-center gap-12 p-8">
      <Image
        src="/img/row-boat.webp"
        alt="Row Boat"
        width={340}
        height={295}
        className="h-auto max-w-full object-contain"
      />
      <div>
        <h1 className="mb-4 text-5xl font-normal">Start a quest ...</h1>
        <p className="max-w-80 font-thin md:max-w-xl">
          Your first quest awaits! With a little help from your friends and
          their friends, you’ll find doors opening that felt just out of reach —
          together, step by step.
        </p>
      </div>
      <div className="absolute right-4 bottom-4">
        <Button className="btn-circle" onClick={gotoCreateQuest}>
          <PlusIcon />
        </Button>
      </div>
    </div>
  );
}
