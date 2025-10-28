"use client";

import { ReadMore } from "@/components/read_more";
import { ReflowTree } from "@/components/reflow_tree";

export function LinkStoryContent({ description }: { description: string }) {
  return (
    <ReadMore
      maxHeight="15rem"
      className="card bg-base-100 self-stretch p-4 md:w-2/3"
    >
      {description.split("\n").map((paragraph, index) => (
        <p key={index} className="mb-2 last:mb-0">
          {paragraph}
        </p>
      ))}
    </ReadMore>
  );
}

export function LinkReflowCard() {
  return (
    <div className="card bg-accent-content text-accent border-accent flex-1 items-center justify-center self-stretch border p-4 md:max-h-[15rem]">
      <ReflowTree />
    </div>
  );
}
