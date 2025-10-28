"use client";

import { MobileHeader } from "@/components/mobile_header";
import type { SafeUser } from "@/helpers/server/auth";

type LinkTitleSectionProps = { user?: SafeUser; title: string };

export function LinkTitleSection({ user, title }: LinkTitleSectionProps) {
  return (
    <div className="flex w-full flex-row items-center justify-start gap-6">
      <h1 className="text-4xl font-normal md:w-2/3">{title}</h1>
      <div className="hidden flex-1 items-center justify-center md:flex">
        <MobileHeader inverseRole user={user} />
      </div>
    </div>
  );
}
