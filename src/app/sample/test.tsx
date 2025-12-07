"use client";

import { useRealtime } from "@/helpers/client/realtime";
import doSomething from "./sa";

export const Test = ({ jwt }: { jwt: string }) => {
  const { connectionState, latestMessage } = useRealtime(jwt);
  return (
    <div>
      <button onClick={doSomething}>Do Something</button>
      <p>Connection State: {connectionState}</p>
      <pre>Latest Message: {JSON.stringify(latestMessage, null, 2)}</pre>
    </div>
  );
};
