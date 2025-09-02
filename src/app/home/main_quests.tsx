import { Button } from "@/components/button";
import { Carousel } from "@/components/carousel";
import { ArrowRightIcon } from "@/components/icons/arrow_right";
import { ShareIcon } from "@/components/icons/share";
import { Leaf } from "@/components/leaf";
import { MobileDock } from "@/components/mobile_dock";
import { MobileHeader } from "@/components/mobile_header";
import { Sidebar } from "@/components/sidebar";
import { Avatar } from "@/components/user_avatar";
import Image from "next/image";

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
    <div className="relative flex flex-col self-stretch items-center justify-between">
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
            className="w-8 md:w-12 border-3 border-primary rounded-full"
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
                className="w-6 md:w-9 border-3 border-primary rounded-full"
                {...avatar}
              />
            ))}
          </div>
          <hr className="flex-1 w-1 bg-primary border-none" />
        </>
      )}
      <Avatar
        className="w-8 md:w-12 border-3 border-primary rounded-full"
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
          <div className="w-full h-full p-4 md:p-8 gap-4 md:gap-8 flex-1 grid grid-cols-1 md:grid-cols-1 items-center justify-center relative overflow-y-scroll">
            {new Array(7).fill(null).map((_, i) => (
              <div
                key={`quest-${i}`}
                className="max-w-4xl flex-1 h-auto flex flex-row gap-2 py-4 border-b"
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
