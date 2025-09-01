"use client";

import Image from "next/image";
import { MobileHeader } from "@/components/mobile_header";
import { Button } from "@/components/button";
import { Carousel } from "@/components/carousel";
import { AvatarGroup } from "@/components/user_avatar";
import { ReadMore } from "@/components/read_more";
import { ReflowTree } from "@/components/reflow_tree";
import { cn } from "@/helpers/client/tailwind_helpers";
import { Timeline } from "@/components/timeline";
import { EyeIcon } from "@/components/icons/eye";
import { ShareIcon } from "@/components/icons/share";
import { BulbIcon } from "@/components/icons/bulb";
import { ChatBubbleIcon } from "@/components/icons/chat_bubble";
import { HopeflowLogo } from "@/components/logos/hopeflow";

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

export function LinkMain() {
  return (
    <div className="max-w-6xl w-full flex flex-col self-center">
      <MobileHeader />
      <div className="flex flex-col gap-4 md:gap-6 p-6">
        <div className="w-full flex flex-row items-center justify-center">
          <h1 className="font-normal text-4xl">
            Help Jacob find his stolen bicycle
          </h1>
          <div className="flex-1"></div>
          <Image src="/img/wordmark.webp" alt="Home" width={118} height={32} className="h-10 w-auto object-contain" />
        </div>
        <div className="flex flex-col md:flex-row gap-4 md:gap-6">
          <div className="md:w-2/3 flex flex-col gap-4">
            <Carousel className="outline-base-content outline-2">
              <Image
                src="https://pub-7027dcead7294deeacde6da1a50ed32f.r2.dev/trek-520-grando-51cm-v0.jpeg"
                width={403.2}
                height={302.4}
                alt="Trek 520 Grando"
                className="rounded-box"
              />
              <Image
                src="https://pub-7027dcead7294deeacde6da1a50ed32f.r2.dev/trek-520-grando-51cm-v0.jpeg"
                width={4032 / 2}
                height={3024 / 2}
                alt="Trek 520 Grando"
                className="w-auto object-contain"
              />
            </Carousel>
            <div className="p-4 text-sm md:text-lg flex flex-row md:flex-row items-center gap-4 rounded-box bg-base-300">
              <div>
                <b className="text-amber-700">Withering </b>
                <div
                  className="inline-flex flex-row justify-center items-center align-middle"
                  style={
                    {
                      "--branch-color": "var(--color-amber-600, #22c55e)",
                      "--leaf-color": "var(--color-amber-300, #22c55e)",
                    } as React.CSSProperties
                  }
                >
                  <Leaf className="h-4 md:h-6" />
                </div>
              </div>
              <p>
                <b>Expires</b> if{" "}
                <span className="inline md:hidden">dormant</span>
                <span className="hidden md:inline">
                  gets <i>no contribution</i>
                </span>
                <span className="inline md:hidden"> for </span>
                <span className="hidden md:inline"> in next </span>
                <b>7 days</b>
              </p>
            </div>
          </div>
          <div className="card flex-1 p-4 font-light bg-info text-info-content flex-col gap-4 flex">
            <div className="flex gap-4 flex-col items-start md:flex">
              <div className="flex-grow-0 flex-shink-0 flex flex-row gap-2 items-center hover:[&>.avatar-group]:space-x-2 hover:[&>.avatar-group-desc]:opacity-0  active:[&>.avatar-group]:space-x-2 active:[&>.avatar-group-desc]:opacity-0 select-none">
                <AvatarGroup
                  className="[&_*]:select-none [&>.avatar]:transition-all [&>.avatar]:duration-1000"
                  userAvatarProps={[
                    {
                      name: "Patric",
                      imageUrl: "/img/avatar5.jpeg",
                      imageWidth: 1024,
                      imageHeight: 1024,
                    },
                    {
                      name: "Ursella",
                      imageUrl: "/img/avatar8.jpeg",
                      imageWidth: 1024,
                      imageHeight: 1024,
                    },
                    {
                      name: "Behrooz",
                      imageUrl: "/img/behrooz.jpeg",
                      imageWidth: 640,
                      imageHeight: 640,
                    },
                  ]}
                />
                <p className="transition-opacity opacity-1000 duration-1500 avatar-group-desc basis-0 flex-1 max-h-[2lh] overflow-hidden">
                  <a className="link link-info-content">Behrooz</a> shares this
                  with you on behalf of Jacob
                </p>
              </div>
              <p>
                Because he thinks you could be of great help as you live in the
                neigborhood and you know bikes very well. You too share the
                passion to help people by any means possible.
              </p>
            </div>
            <div className="hidden flex-1 md:block"></div>
            <div className="flex flex-col md:flex-col justify-between gap-4 font-normal">
              <div className="flex w-full flex-col gap-2 items-stretch justify-between">
                <p>If you have seen this bike or a similar one</p>
                <Button buttonType="primary">
                  Connect and chat with Jacob
                </Button>
              </div>
              <div className="flex w-full flex-col gap-2 items-stretch justify-between">
                <p>If you know a friend that might</p>
                <Button buttonType="secondary">Reflow the quest to them</Button>
              </div>
            </div>
          </div>
        </div>
        <div className="flex flex-col md:flex-row gap-4 items-start">
          <div className="collapse collapse-plus bg-warning-content text-warning border border-warning">
            <input type="checkbox" />
            <div className="collapse-title font-normal flex flex-row justify-between">
              🌺 Your action may be crucial
            </div>
            <div className="collapse-content text-justify">
              <p>
                Out of the <b>300</b> individuals who have visited this quest,{" "}
                <b>only 10</b>😢 has taken action. The success of{" "}
                <i>HopeFlow</i> quests relies upon word being spread, so that
                those who hold the answers may be reached.
              </p>
              <p>
                <b>Your contribution</b> could be <b>the spark that helps</b>🌱
                this quest tree flourish and draws forth the ones destined to
                respond 🌳😊.
              </p>
            </div>
          </div>
          <div className="collapse collapse-plus bg-success-content text-success border border-success">
            <input type="checkbox" />
            <div className="collapse-title font-normal flex flex-row justify-between">
              🕊️ Recompense (💠 425 max.)
            </div>
            <div className="collapse-content text-justify">
              <p>
                <i>950 credences</i>💠 has been allocated for the quest. If{" "}
                <i>you</i> solve it directly, you&apos;ll receive <b>half</b>{" "}
                which is <b>425 credences</b>.
              </p>
              <p>
                If your pass the word on, rewards then flow through a{" "}
                <b>recursive split 🌀</b>. The solver gets <b>½</b>; the
                referrer <b>¼</b>, the one before <b>⅛</b>... each step halving.
                Say you pass to your friend, whose aquintance provides the
                answer, you&apos;ll earn <b>⅛ = 106.25 credences 💠</b>.
              </p>{" "}
            </div>
          </div>
        </div>
        <div className="flex flex-col md:flex-row gap-4 md:gap-6">
          <ReadMore
            maxHeight="15rem"
            className="md:w-2/3 card p-4 bg-base-100 self-stretch"
          >
            <p className="mb-2">
              My trek 520 grando was stolen last week. 51cm height. The red
              pusher pedals might help as well. Please let me know if you happen
              across one on your local online marketplace (anywhere in the US).
              If seen in public, please ask the owner politely where they bought
              it, and if you can see the serial number. It&apos;s WTU216LK0060R
            </p>
            <p className="mb-2">
              I am offering $20 dollars for each post of a Trek 520 Grando with
              the same color scheme in these photos as well as the exact same
              height (51 cm). Heights of 49, 50, 52, 53 will be rewarded $10.
              Can pay out reward with Paypal, Amazon gift cards, venmo, zelle or
              crypto. $300 bounty if my bike is found and an extra $200 if I
              manage to recover it.
            </p>
            <p>
              I have a lot of sentimental value in this bike. Mom passed shortly
              before our first child was born. We moved temporarily 1.5 hrs
              commute away to my in-laws and this trek helped me with the last 5
              miles of the commute back from work.
            </p>
          </ReadMore>
          <div className="flex-1 card p-4 bg-accent-content text-accent border-accent border self-stretch justify-center items-center md:max-h-[15rem]">
            <ReflowTree />
          </div>
        </div>
        <div className="flex flex-col md:flex-row gap-4 md:gap-6 items-start">
          <ReadMore
            maxHeight="15rem"
            className="md:w-2/3 card p-4 bg-base-100 outline-1"
          >
            <Timeline
              actions={[
                {
                  name: "Jacob",
                  imageUrl: "/img/avatar2.jpeg",
                  timestamp: new Date(Date.now() - 48 * 60 * 60 * 1000),
                  type: "started the quest",
                },
                {
                  name: "Jacob",
                  imageUrl: "/img/avatar2.jpeg",
                  timestamp: new Date(Date.now() - 35 * 60 * 60 * 1000),
                  type: "reflowed the quest",
                },
                {
                  name: "Martha",
                  imageUrl: "/img/avatar4.jpeg",
                  timestamp: new Date(Date.now() - 28 * 60 * 60 * 1000),
                  type: "reflowed the quest",
                },
                {
                  name: "Martha",
                  imageUrl: "/img/avatar4.jpeg",
                  timestamp: new Date(Date.now() - 22 * 60 * 60 * 1000),
                  type: "commented on the quest",
                  description:
                    "I hope you will find your bike and get it back safely.",
                },
                {
                  name: "Behrooz",
                  imageUrl: "/img/behrooz.jpeg",
                  timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000),
                  type: "reflowed the quest",
                  description:
                    "Saeed is in the neighborhood and knows bikes well. He likes to help people as much as I do",
                },
              ]}
            />
          </ReadMore>
          <div className="flex-1 flex flex-col gap-4 self-stretch">
            <div className="h-[15rem] card p-4 bg-secondary-content text-secondary border-secondary border flex flex-col justify-start items-start">
              <b className="font-bold mb-3">Statistics</b>
              <div className="flex flex-row gap-4">
                <EyeIcon /> 150 people have seen this quest
              </div>
              <div className="flex flex-row gap-4">
                <ShareIcon /> 10 people shared this quest
              </div>
              <div className="flex flex-row gap-4">
                <BulbIcon /> No one submitted any leads
              </div>
              <div className="flex flex-row gap-4">
                <ChatBubbleIcon /> Martha commented on the quest
              </div>
            </div>
          </div>
        </div>
        <div className="flex-1 card p-4 bg-base-300 text-base-content flex flex-col md:flex-row md:items-center gap-4 justify-start items-start">
          <div className="flex flex-row gap-2">
            <div className="avatar inline-block">
              <div className="w-8 rounded-full">
                <Image
                  src={"/img/avatar2.jpeg"}
                  width={32}
                  height={32}
                  alt="Jacob"
                  className="max-w-full h-auto object-contain"
                />
              </div>
            </div>
            <div className="flex flex-col md:flex-row md:items-center gap-2">
              <span>Jacob started this quest</span>
              <i>on 13th July 2024</i>
            </div>
          </div>
          <div className="flex-1"></div>
          <div className="flex flex-col md:flex-row gap-2 md:items-center">
            Have questions?
            <Button buttonType="base" buttonStyle="outline">
              Ask a question
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
