"use client";

import Image from "next/image";
import { MobileHeader } from "@/components/mobile_header";
import { Button } from "@/components/button";
import { MediaCarousel } from "@/components/media_carousel";
import { AvatarGroup } from "@/components/user_avatar";
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
import {
  showSubmitAnswerModal,
  SubmitAnswerModal,
} from "@/modals/submit_answer_modal";
import { SafeUser } from "@/helpers/server/auth";

export function LinkMain({ user }: { user?: SafeUser }) {
  return (
    <div className="max-w-6xl w-full flex flex-col self-center">
      <MobileHeader user={user} />
      <div className="flex flex-col gap-4 md:gap-6 p-6">
        <div className="w-full flex flex-row items-center justify-start gap-6">
          <h1 className="md:w-2/3 font-normal text-4xl">
            Help Jacob find his stolen bicycle
          </h1>
          <div className="flex-1 hidden md:flex items-center justify-center">
            <MobileHeader inverseRole user={user} />
          </div>
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
          <div className="card flex-1 p-2 md:p-4 font-light bg-info text-info-content flex-col gap-4 flex">
            <div className="flex p-2 md:p-0 gap-4 flex-col items-start md:flex">
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
            <div className="flex flex-col justify-between gap-4 font-normal">
              <Button buttonType="primary" onClick={() => showReflowModal()}>
                <ReflowIcon size={18} /> I know someone ...
              </Button>
              <ReflowModal />
              <div className="flex w-full flex-row gap-2 items-stretch justify-between">
                <Button
                  buttonType="secondary"
                  className="flex-1"
                  onClick={() => {
                    showSubmitAnswerModal();
                  }}
                >
                  <BulbIcon size={18} /> I&apos;ve seen it
                </Button>
                <SubmitAnswerModal
                  questions={[
                    { question: "Some question", answerRequired: true },
                    { question: "Some other question", answerRequired: false },
                  ]}
                />
                <Button
                  buttonType="neutral"
                  buttonStyle="soft"
                  className="flex-1"
                >
                  <BookmarkIcon size={18} />
                  I&apos;ll see later
                </Button>
              </div>
            </div>
          </div>
        </div>
        <div className="flex flex-col md:flex-row gap-6 items-start">
          <div className="md:w-2/3 collapse collapse-plus bg-warning-content text-warning border border-warning">
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
          <div className="flex-1 collapse collapse-plus bg-success-content text-success border border-success">
            <input type="checkbox" />
            <div className="collapse-title font-normal flex flex-row justify-between">
              🕊️ Recompense ($425 max.)
            </div>
            <div className="collapse-content text-justify">
              <p>
                <i>$950</i> has been allocated for the quest. If <i>you</i>{" "}
                solve it directly, you&apos;ll receive <b>half</b> which is{" "}
                <b>$425</b>.
              </p>
              <p>
                If your pass the word on, rewards then flow through a{" "}
                <b>recursive split 🌀</b>. The solver gets <b>½</b>; the
                referrer <b>¼</b>, the one before <b>⅛</b>... each step halving.
                Say you pass to your friend, whose aquintance provides the
                answer, you&apos;ll earn <b>⅛ = $106.25</b>.
              </p>
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
                <MediatorsIcon /> 10 people shared this quest
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
