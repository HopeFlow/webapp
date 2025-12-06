"use client";

import { ReadMore } from "@/components/read_more";

export function LinkStoryContent({ description }: { description: string }) {
  return (
    <ReadMore
      maxHeight="15rem"
      className="card bg-base-100 min-h-[15rem] self-stretch p-4"
    >
      {description.split("\n").map((paragraph, index) => (
        <p key={index} className="mb-2 last:mb-0">
          {paragraph}
        </p>
      ))}
    </ReadMore>
  );
}
