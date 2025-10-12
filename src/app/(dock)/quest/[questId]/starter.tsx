"use client";

import Image from "next/image";
import { MobileHeader } from "@/components/mobile_header";
import { Button, GhostButton } from "@/components/button";
import { MediaCarousel } from "@/components/media_carousel";
import { Avatar, AvatarGroup } from "@/components/user_avatar";
import { ReadMore } from "@/components/read_more";
import { ReflowTree } from "@/components/reflow_tree";
import { Timeline } from "@/components/timeline";
import { EyeIcon } from "@/components/icons/eye";
import { BulbIcon } from "@/components/icons/bulb";
import { ChatBubbleIcon } from "@/components/icons/chat_bubble";
import { Leaf } from "@/components/leaf";
import { ReflowIcon } from "@/components/icons/reflow";
import { BookmarkIcon } from "@/components/icons/bookmark";
import { MediatorsIcon } from "@/components/icons/mediators";
import { ReflowModal, showReflowModal } from "@/modals/reflow_modal";
import { PencilSquareIcon } from "@/components/icons/pencil_square";
import { ArrowRightIcon } from "@/components/icons/arrow_right";

export function QuestStarterView() {
  return (
    <div className="max-w-6xl w-full flex flex-col self-center">
      <div className="flex flex-col gap-4 md:gap-6 p-6">
        <div className="w-full flex flex-row items-center justify-start gap-1">
          <h1 className="font-normal text-4xl">
            Looking for my sentimental stolen Trek 520
          </h1>
          <GhostButton className="px-2">
            <PencilSquareIcon />
          </GhostButton>
        </div>
        <div className="flex flex-col md:flex-row gap-4 md:gap-6">
          <div className="md:w-2/3 flex flex-col gap-4">
            <MediaCarousel className="outline-base-content outline-2">
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
            </MediaCarousel>
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
          <div className="flex-1 font-light text-base-content flex-col gap-4 flex">
            <div className="card p-2 md:p-4 flex flex-col gap-2 text-base-content/95 bg-base-100">
              <h1 className="font-bold text-lg text-success">Recompense</h1>
              <div className="flex flex-row gap-2 items-center">
                <p className="text-lg">
                  <span className="font-semibold">$2,000</span> Total
                </p>
                <GhostButton className="px-2">
                  <PencilSquareIcon />
                </GhostButton>
              </div>
              <div className="flex flex-row gap-2 items-center justify-between">
                <div className="flex flex-row gap-2 items-start text-sm">
                  <BulbIcon
                    size={24}
                    className="bg-base-300 text-base-content border p-1 rounded-full"
                  />
                  <p className="text-sm">
                    <span className="font-semibold">$1,000</span> Finder's Fee
                  </p>
                </div>
                <div className="flex flex-row gap-2 items-start text-sm">
                  <ReflowIcon
                    size={24}
                    className="bg-base-300 text-base-content border p-1 rounded-full"
                  />
                  <p className="text-sm">
                    <span className="font-semibold">$500(Max)</span> ReFlow
                    Reward
                  </p>
                </div>
              </div>
            </div>
            <div className="card flex-1 p-2 md:p-4 bg-base-100 flex flex-col gap-2 text-base-content/95 text-sm">
              <h1 className="font-bold text-lg text-success">Statistics</h1>
              <div className="flex flex-row gap-4">
                <EyeIcon /> 150 people have seen this quest
              </div>
              <div className="flex flex-row gap-4">
                <MediatorsIcon /> 10 people shared this quest
              </div>
              <div className="flex flex-row gap-4">
                <BulbIcon /> No one submitted any leads
              </div>
              <div className="flex flex-row gap-4">
                <ChatBubbleIcon /> Martha commented on the quest
              </div>
            </div>
            <div className="card bg-info p-4 flex flex-col justify-end gap-4 font-normal">
              <p>Invite more people, get more possible leads</p>
              <Button buttonType="primary" onClick={() => showReflowModal()}>
                <ReflowIcon size={18} /> ReFlow to more people
              </Button>
              <ReflowModal />
            </div>
          </div>
        </div>
        <div className="flex flex-col-reverse md:flex-row gap-4 md:gap-6">
          <div className="md:w-2/3 card p-4 bg-base-100 self-stretch">
            <div className="mb-4 flex flex-row justify-between items-center">
              <h1 className="font-bold text-2xl text-primary">
                Contributors say ...
              </h1>
            </div>
            <ul>
              {[
                {
                  name: "Jacob",
                  imageUrl: "/img/avatar2.jpeg",
                  imageWidth: 64,
                  imageHeight: 64,
                  message:
                    "I have seen a similar bike listed on Craigslist recently. I will send you the link.",
                },
                {
                  name: "Behrooz",
                  imageUrl: "/img/behrooz.jpeg",
                  imageWidth: 64,
                  imageHeight: 64,
                  message: "How can I identify your bike among similar models?",
                },
                {
                  name: "Martha",
                  imageUrl: "/img/avatar4.jpeg",
                  imageWidth: 64,
                  imageHeight: 64,
                  message: "When and where was it stolen?",
                },
              ].map((user, index) => (
                <li
                  key={index}
                  className="py-1 flex flex-row items-center gap-2"
                >
                  <Avatar className="rounded-full w-8 md:w-8" {...user} />
                  <span className="hidden md:inline font-bold">
                    {user.name}
                  </span>
                  <span className="hidden md:inline"> says</span>
                  <span className="italic text-ellipsis overflow-hidden flex-1 whitespace-nowrap">
                    {user.message}
                  </span>
                  <Button buttonType="primary" buttonSize="sm" className="px-2">
                    <ChatBubbleIcon />
                  </Button>
                </li>
              ))}
            </ul>
          </div>
          <div className="flex-1 card p-4 bg-secondary-content text-secondary border-secondary border self-stretch justify-center items-center">
            <div className="w-full mb-4 flex flex-row justify-between items-center">
              <h1 className="font-bold text-2xl">
                Leads
              </h1>
            </div>
            <ul className="w-full">
              {[
                {
                  name: "Sora",
                  imageUrl: "/img/avatar4.jpeg",
                  imageWidth: 64,
                  imageHeight: 64,
                  score: 70,
                },
                {
                  name: "Johan",
                  imageUrl: "/img/avatar5.jpeg",
                  imageWidth: 64,
                  imageHeight: 64,
                  score: 40,
                },
                {
                  name: "Martha",
                  imageUrl: "/img/avatar9.jpeg",
                  imageWidth: 64,
                  imageHeight: 64,
                  score: 95,
                },
              ].map((user, index) => (
                <li
                  key={index}
                  className="w-full py-1 flex flex-row items-center gap-2"
                >
                  <Avatar className="rounded-full w-8 md:w-8" {...user} />
                  <div className="italic text-ellipsis overflow-hidden flex-1 whitespace-nowrap">
                    <progress
                      className="progress progress-secondary w-full"
                      value={user.score}
                      max="100"
                    ></progress>
                  </div>
                  <Button buttonType="secondary" buttonSize="sm" className="px-2">
                    <ArrowRightIcon />
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="flex flex-col md:flex-row gap-4 md:gap-6">
          <div className="md:w-2/3 card p-4 bg-base-100 self-stretch">
            <div className="mb-4 flex flex-row justify-between items-center">
              <h1 className="font-bold text-2xl text-primary">Description</h1>
              <GhostButton className="px-2">
                <PencilSquareIcon />
              </GhostButton>
            </div>
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
          </div>
          <div className="flex-1 card p-4 bg-accent-content text-accent border-accent border self-stretch justify-center items-center">
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
            <div className="md:h-[15rem] card p-4 bg-error-content text-error border-secondary border flex flex-col justify-start items-start">
              <b className="font-bold mb-3">Danger Zone</b>
              <div className="flex-1"></div>
              <Button buttonType="error" className="w-full">
                Terminate the quest
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
