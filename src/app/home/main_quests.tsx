import { Button } from "@/components/button";
import { Carousel } from "@/components/carousel";
import { ArrowRightIcon } from "@/components/icons/arrow_right";
import { PlusIcon } from "@/components/icons/plus";
import { ShareIcon } from "@/components/icons/share";
import { MobileDock } from "@/components/mobile_dock";
import { MobileHeader } from "@/components/mobile_header";
import { Sidebar } from "@/components/sidebar";
import { Avatar } from "@/components/user_avatar";
import { cn } from "@/helpers/client/tailwind_helpers";
import Image from "next/image";

const Leaf = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 54.005 93.34"
    className={cn("h-6", className)}
  >
    <path
      d="M 16.898 90.081 c -4.275 -3.634 -15.085 -11.87 -16.763 -27.884 c -1.677 -16.013 12.477 -40.408 27.672 -53.132 c 3.056 -2.077 9.37 -8.299 12.952 -9.065 c 6.862 7.647 16.208 34.71 12.34 54.804 c -3.803 21.913 -23.084 31.22 -28.313 35.672 c -5.23 4.452 -3.612 3.239 -7.888 -0.395 z"
      strokeWidth=".264583"
      fill="var(--leaf-color, #e4e2de)"
    />
    <path
      d="M 20.05 107.001 c -1.648 -1.005 -2.135 -10.357 -1.274 -24.498 c 0.547 -9.111 2.814 -14.71 -0.624 -19.77 c -3.438 -5.06 -5.784 -18.547 -5.063 -16.874 c 1.059 4.457 7.39 13.777 7.39 13.777 c 1.89 -2.004 6.629 -24.273 14.706 -37.424 c -2.34 9.28 -3.921 14.59 -6.005 23.408 c -1.014 4.282 -0.979 4.303 3.47 2 c 3.957 -2.05 13.976 -6.84 13.976 -6.84 s -17.627 10.52 -19.126 17.07 c -1.5 6.552 -3.35 30.112 -2.396 42.615 c 0.806 4.004 -0.267 9.212 -5.054 6.536 z"
      strokeWidth=".264583"
      fill="var(--branch-color, #cccbc5)"
    />
  </svg>
);

function QuestNodes({
  avatars,
}: {
  avatars: Array<{
    name: string;
    imageUrl: string;
    imageWidth: number;
    imageHeight: number;
  }>;
}) {
  return (
    <div className="relative w-10 flex flex-col self-stretch items-center justify-between">
      <div className="flex flex-col items-center gap-1 text-neutral-500">
        <ShareIcon />
        <h2>{avatars.length - 1}</h2>
      </div>
      <div className="h-4"></div>
      {avatars.length > 0 && (
        <>
          <div className="flex flex-row text-xs items-center justify-center">
            10 min
          </div>
          <Avatar
            className="w-8 border-3 border-primary rounded-full"
            {...avatars[avatars.length - 1]}
          />
        </>
      )}
      {avatars.length > 0 && (
        <hr className="flex-1 w-0 border-primary border-2" />
      )}
      {avatars.length > 5 && (
        <hr className="flex-1 w-0 border-primary border-2 border-dashed" />
      )}
      {avatars.length > 2 && (
        <>
          <div className="flex flex-col -space-y-3">
            {avatars.slice(-4, -1).map((avatar, i) => (
              <Avatar
                key={`avatar-${i + 1}`}
                className="w-6 border-3 border-primary rounded-full"
                {...avatar}
              />
            ))}
          </div>
          <hr className="flex-1 w-1 bg-primary border-none" />
        </>
      )}
      <Avatar
        className="w-8 border-3 border-primary rounded-full"
        {...avatars[0]}
      />
      <div className="absolute -bottom-1 left-[calc(100%+0.5rem)] w-auto text-sm">
        <h1 className="font-bold">Elizabeth</h1>
        <p className="text-xs">2 days</p>
      </div>
    </div>
  );
}

export default function HomeMain() {
  return (
    <div className="flex-1 w-full flex flex-row items-stretch">
      <Sidebar />
      <div className="flex-1 bg-base-200 relative">
        <div className="absolute top-0 left-0 w-full h-full flex flex-col items-center justify-center">
          <MobileHeader />
          <div className="w-full h-full p-4 md:p-8 gap-4 md:gap-8 flex-1 grid grid-cols-1 md:grid-cols-2 items-center justify-center relative overflow-y-scroll">
            {new Array(7).fill(null).map((_, i) => (
              <div
                key={`quest-${i}`}
                className="flex-1 h-auto flex flex-row gap-2 py-4 border-b"
              >
                <QuestNodes
                  avatars={[
                    {
                      name: "John Doe",
                      imageUrl: "/img/avatar1.jpeg",
                      imageWidth: 64,
                      imageHeight: 64,
                    },
                    {
                      name: "Jane Doe",
                      imageUrl: "/img/avatar2.jpeg",
                      imageWidth: 64,
                      imageHeight: 64,
                    },
                    {
                      name: "Steve Doe",
                      imageUrl: "/img/avatar3.jpeg",
                      imageWidth: 64,
                      imageHeight: 64,
                    },
                    {
                      name: "Jane Smith",
                      imageUrl: "/img/avatar4.jpeg",
                      imageWidth: 64,
                      imageHeight: 64,
                    },
                    {
                      name: "John Smith",
                      imageUrl: "/img/avatar5.jpeg",
                      imageWidth: 64,
                      imageHeight: 64,
                    },
                    {
                      name: "John Doe",
                      imageUrl: "/img/avatar1.jpeg",
                      imageWidth: 64,
                      imageHeight: 64,
                    },
                    {
                      name: "Jane Doe",
                      imageUrl: "/img/avatar2.jpeg",
                      imageWidth: 64,
                      imageHeight: 64,
                    },
                    {
                      name: "Steve Doe",
                      imageUrl: "/img/avatar3.jpeg",
                      imageWidth: 64,
                      imageHeight: 64,
                    },
                    {
                      name: "Jane Smith",
                      imageUrl: "/img/avatar4.jpeg",
                      imageWidth: 64,
                      imageHeight: 64,
                    },
                    {
                      name: "John Smith",
                      imageUrl: "/img/avatar5.jpeg",
                      imageWidth: 64,
                      imageHeight: 64,
                    },
                  ]}
                />
                <div className="flex-1 flex flex-col gap-2 items-start">
                  <h1>
                    {i % 4 === 0
                      ? "Help Jacob find his stolen bicycle"
                      : i % 4 === 1
                      ? "Help Megan find participants"
                      : i % 4 === 2
                      ? "Stand with Nadine to get the slow-motion camera"
                      : "Aid UDDS find interpreters"}
                  </h1>
                  <Carousel className="w-full h-48 md:h-96 flex flex-col items-center justify-center rounded-box overflow-hidden bg-base-content">
                    <Image
                      src={
                        i % 4 === 0
                          ? "https://pub-7027dcead7294deeacde6da1a50ed32f.r2.dev/trek-520-grando-51cm-v0.jpeg"
                          : i % 4 === 1
                          ? "https://pub-7027dcead7294deeacde6da1a50ed32f.r2.dev/591b81d178372c6849f7293e1e9f2ec6af38ec6a.jpg"
                          : i % 4 === 2
                          ? "https://pub-7027dcead7294deeacde6da1a50ed32f.r2.dev/aac0472d8c10c654a4bd4c8a8844ccecb3a08915.png"
                          : "https://pub-7027dcead7294deeacde6da1a50ed32f.r2.dev/cc39dd4dff87f2e29a5482f643d391a057f72d5f.png"
                      }
                      alt="Trek 520 Grando"
                      width={4032 / 2}
                      height={3024 / 2}
                      className="max-h-full w-auto object-contain"
                    />
                  </Carousel>
                  <div className="w-full flex flex-row">
                    <span className="h-full inline-flex flex-row items-center gap-2">
                      💠 +2000
                    </span>
                    <span className="flex-1"></span>
                    <span
                      className="text-amber-700 text-sm h-full inline-flex flex-row items-center gap-2"
                      style={
                        {
                          "--branch-color": "var(--color-amber-600, #22c55e)",
                          "--leaf-color": "var(--color-amber-300, #22c55e)",
                        } as React.CSSProperties
                      }
                    >
                      Withering <Leaf className="inline h-4 md:h-6" />
                    </span>
                  </div>
                  <div className="badge badge-error">No leads yet</div>
                  <div className="w-full h-10 flex flex-row items-end justify-end">
                    <Button
                      buttonSize="sm"
                      buttonType="base"
                      buttonStyle="outline"
                    >
                      Manage <ArrowRightIcon />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <MobileDock />
        </div>
      </div>
    </div>
  );
}
