import { LoadingBlocker } from "@/components/loading";
import {
  currentUserNoThrow,
  SafeUser,
  user2SafeUser,
} from "@/helpers/server/auth";
import { ReactElement, Suspense } from "react";

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export type PropsWithUser<U = {}> = U & { user?: SafeUser };

export function withUser<U>(
  F: (
    props: PropsWithUser<U> & { userId?: string },
  ) => ReactElement | Promise<ReactElement>,
  displayName?: string,
) {
  async function Result(props: U) {
    const user = await currentUserNoThrow();
    return (
      <Suspense fallback={<LoadingBlocker />}>
        <F
          {...props}
          user={user ? user2SafeUser(user) : undefined}
          userId={user ? user.id : undefined}
        />
      </Suspense>
    );
  }
  if (displayName) Result.displayName = displayName;
  else if (Object.hasOwn(F, "displayName"))
    Result.displayName = (F as unknown as { displayName: string }).displayName;
  return Result;
}
