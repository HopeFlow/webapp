import { z } from "zod";
import { withParams } from "@/helpers/server/page_component";

export default withParams(
  function Chat({}: { questId: string; nodeId: string }) {
    return (
      <div className="p-4 md:p-8 flex-1 flex flex-col">
        <h1 className="font-normal text-2xl">
          Jacob's stolen sentimental bicycle &mdash; Jacob &amp; Obi-Wan{" "}
        </h1>
        <div className="w-full overflow-y-auto overflow-x-hidden">
          <div className="chat chat-start">
            <div className="chat-image avatar">
              <div className="w-10 rounded-full">
                <img
                  alt="Tailwind CSS chat bubble component"
                  src="https://img.daisyui.com/images/profile/demo/kenobee@192.webp"
                />
              </div>
            </div>
            <div className="chat-header">
              Obi-Wan Kenobi
              <time className="text-xs opacity-50">12:45</time>
            </div>
            <div className="chat-bubble chat-bubble-accent">
              You were the Chosen One! You were the Chosen One! You were the
              Chosen One! You were the Chosen One! You were the Chosen One! You
              were the Chosen One! You were the Chosen One! You were the Chosen
              One! You were the Chosen One! You were the Chosen One!
            </div>
            <div className="chat-footer opacity-50">Delivered</div>
          </div>
          {[1, 2, 3].map((e) => (
            <div key={`m-${e}`} className="chat chat-end">
              <div className="chat-image avatar">
                <div className="w-10 rounded-full">
                  <img
                    alt="Tailwind CSS chat bubble component"
                    src="https://img.daisyui.com/images/profile/demo/anakeen@192.webp"
                  />
                </div>
              </div>
              <div className="chat-header">
                Anakin
                <time className="text-xs opacity-50">12:46</time>
              </div>
              <div className="chat-bubble">I hate you!</div>
            </div>
          ))}
        </div>
      </div>
    );
  },
  {
    paramsTypeDef: z.object({
      questId: z.string(),
      nodeId: z.string(),
    }),
  },
);
