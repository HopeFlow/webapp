"use client";

import Image from "next/image";
import { Button, GhostButton } from "@/components/button";
import { MediaCarousel } from "@/components/media_carousel";
import { Avatar } from "@/components/user_avatar";
import { ReadMore } from "@/components/read_more";
import { ReflowTree } from "@/components/reflow_tree";
import { Timeline } from "@/components/timeline";
import { EyeIcon } from "@/components/icons/eye";
import { BulbIcon } from "@/components/icons/bulb";
import { ChatBubbleIcon } from "@/components/icons/chat_bubble";
import { Leaf } from "@/components/leaf";
import { ReflowIcon } from "@/components/icons/reflow";
import { MediatorsIcon } from "@/components/icons/mediators";
import { ReflowModal, showReflowModal } from "@/modals/reflow_modal";
import { PencilSquareIcon } from "@/components/icons/pencil_square";
import { ArrowRightIcon } from "@/components/icons/arrow_right";
import type { questTable } from "@/db/schema";
import type { QuestState } from "@/helpers/server/db";
import type { ScreeningQuestion } from "@/db/constants";

type QuestStatus = typeof questTable.$inferSelect.status;
type UserShape = { name: string | null; imageUrl: string | null };

export type QuestPageData = {
  questId: string;
  questTitle: string;
  screeningQuestions: ScreeningQuestion[] | null;
  rewardAmount: number;
  latestLeads: Array<{
    id: string;
    content: string;
    status: string;
    createdAt: Date | null;
    decidedAt: Date | null;
    contributor: UserShape;
  }>;
  questStatistics: {
    views: number;
    shares: number;
    leads: number;
    comments: number;
    latestCommenterName: string | null;
  };
  questHealth: { state: QuestState; text: string };
  latestQuestions: Array<{
    id: string;
    content: string;
    timestamp: Date | null;
    askedBy: UserShape;
  }>;
  questDescription: string;
  questHistory: Array<{
    id: string;
    type: string;
    createdAt: Date | null;
    actor: UserShape;
    comment: string | null;
    lead: string | null;
    linkId: string | null;
    nodeId: string | null;
  }>;
  shareTreeNodes: Array<{
    id: string;
    parentId: string | null;
    userId: string;
    user: UserShape;
    createdAt: Date | null;
    referer: string;
    viewLinkId: string | null;
    edgeStrength: number | null;
    edgeLinkCode: string | null;
    edgeType: string | null;
  }>;
  terminationStatus: {
    status: QuestStatus;
    isTerminated: boolean;
    isClosed: boolean;
    finishedAt: Date | null;
    terminatedAt: Date | null;
    farewellMessage: string | null;
  };
};

export function QuestStarterView({ questData }: { questData: QuestPageData }) {
  void questData;
  return (
    <div className="flex w-full max-w-6xl flex-col self-center">
      <div className="flex flex-col gap-4 p-6 md:gap-6">
        <div className="flex w-full flex-row items-center justify-start gap-1">
          <h1 className="text-4xl font-normal">
            Looking for my sentimental stolen Trek 520
          </h1>
          <GhostButton className="px-2">
            <PencilSquareIcon />
          </GhostButton>
        </div>
        <div className="flex flex-col gap-4 md:flex-row md:gap-6">
          <div className="flex flex-col gap-4 md:w-2/3">
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
            <div className="rounded-box bg-base-300 flex flex-row items-center gap-4 p-4 text-sm md:flex-row md:text-lg">
              <div>
                <b className="text-amber-700">Withering </b>
                <div
                  className="inline-flex flex-row items-center justify-center align-middle"
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
          <div className="text-base-content flex flex-1 flex-col gap-4 font-light">
            <div className="card text-base-content/95 bg-base-100 flex flex-col gap-2 p-2 md:p-4">
              <h1 className="text-success text-lg font-bold">Recompense</h1>
              <div className="flex flex-row items-center gap-2">
                <p className="text-lg">
                  <span className="font-semibold">$2,000</span> Total
                </p>
                <GhostButton className="px-2">
                  <PencilSquareIcon />
                </GhostButton>
              </div>
              <div className="flex flex-row items-center justify-between gap-2">
                <div className="flex flex-row items-start gap-2 text-sm">
                  <BulbIcon
                    size={24}
                    className="bg-base-300 text-base-content rounded-full border p-1"
                  />
                  <p className="text-sm">
                    <span className="font-semibold">$1,000</span> Finder&apos;s
                    Fee
                  </p>
                </div>
                <div className="flex flex-row items-start gap-2 text-sm">
                  <ReflowIcon
                    size={24}
                    className="bg-base-300 text-base-content rounded-full border p-1"
                  />
                  <p className="text-sm">
                    <span className="font-semibold">$500(Max)</span> ReFlow
                    Reward
                  </p>
                </div>
              </div>
            </div>
            <div className="card bg-base-100 text-base-content/95 flex flex-1 flex-col gap-2 p-2 text-sm md:p-4">
              <h1 className="text-success text-lg font-bold">Statistics</h1>
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
            <div className="card bg-info flex flex-col justify-end gap-4 p-4 font-normal">
              <p>Invite more people, get more possible leads</p>
              <Button buttonType="primary" onClick={() => showReflowModal()}>
                <ReflowIcon size={18} /> ReFlow to more people
              </Button>
              <ReflowModal />
            </div>
          </div>
        </div>
        <div className="flex flex-col-reverse gap-4 md:flex-row md:gap-6">
          <div className="card bg-base-100 self-stretch p-4 md:w-2/3">
            <div className="mb-4 flex flex-row items-center justify-between">
              <h1 className="text-primary text-2xl font-bold">
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
                  className="flex flex-row items-center gap-2 py-1"
                >
                  <Avatar className="w-8 rounded-full md:w-8" {...user} />
                  <span className="hidden font-bold md:inline">
                    {user.name}
                  </span>
                  <span className="hidden md:inline"> says</span>
                  <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap italic">
                    {user.message}
                  </span>
                  <Button buttonType="primary" buttonSize="sm" className="px-2">
                    <ChatBubbleIcon />
                  </Button>
                </li>
              ))}
            </ul>
          </div>
          <div className="card bg-secondary-content text-secondary border-secondary flex-1 items-center justify-center self-stretch border p-4">
            <div className="mb-4 flex w-full flex-row items-center justify-between">
              <h1 className="text-2xl font-bold">Leads</h1>
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
                  className="flex w-full flex-row items-center gap-2 py-1"
                >
                  <Avatar className="w-8 rounded-full md:w-8" {...user} />
                  <div className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap italic">
                    <progress
                      className="progress progress-secondary w-full"
                      value={user.score}
                      max="100"
                    ></progress>
                  </div>
                  <Button
                    buttonType="secondary"
                    buttonSize="sm"
                    className="px-2"
                  >
                    <ArrowRightIcon />
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="flex flex-col gap-4 md:flex-row md:gap-6">
          <div className="card bg-base-100 self-stretch p-4 md:w-2/3">
            <div className="mb-4 flex flex-row items-center justify-between">
              <h1 className="text-primary text-2xl font-bold">Description</h1>
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
          <div className="card bg-accent-content text-accent border-accent flex-1 items-center justify-center self-stretch border p-4">
            <ReflowTree />
          </div>
        </div>
        <div className="flex flex-col items-start gap-4 md:flex-row md:gap-6">
          <ReadMore
            maxHeight="15rem"
            className="card bg-base-100 p-4 outline-1 md:w-2/3"
          >
            <Timeline
              actions={[
                {
                  name: "Jacob",
                  imageUrl: "/img/avatar2.jpeg",
                  timestamp: new Date(1760525835746 - 48 * 60 * 60 * 1000),
                  type: "started the quest",
                },
                {
                  name: "Jacob",
                  imageUrl: "/img/avatar2.jpeg",
                  timestamp: new Date(1760525835746 - 35 * 60 * 60 * 1000),
                  type: "reflowed the quest",
                },
                {
                  name: "Martha",
                  imageUrl: "/img/avatar4.jpeg",
                  timestamp: new Date(1760525835746 - 28 * 60 * 60 * 1000),
                  type: "reflowed the quest",
                },
                {
                  name: "Martha",
                  imageUrl: "/img/avatar4.jpeg",
                  timestamp: new Date(1760525835746 - 22 * 60 * 60 * 1000),
                  type: "commented on the quest",
                  description:
                    "I hope you will find your bike and get it back safely.",
                },
                {
                  name: "Behrooz",
                  imageUrl: "/img/behrooz.jpeg",
                  timestamp: new Date(1760525835746 - 12 * 60 * 60 * 1000),
                  type: "reflowed the quest",
                  description:
                    "Saeed is in the neighborhood and knows bikes well. He likes to help people as much as I do",
                },
              ]}
            />
          </ReadMore>
          <div className="flex flex-1 flex-col gap-4 self-stretch">
            <div className="card bg-error-content text-error border-secondary flex flex-col items-start justify-start border p-4 md:h-[15rem]">
              <b className="mb-3 font-bold">Danger Zone</b>
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
