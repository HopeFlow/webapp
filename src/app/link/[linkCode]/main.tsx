"use client";

import Image from "next/image";
import { MobileHeader } from "@/components/mobile_header";
import { Button } from "@/components/button";
import { Carousel } from "@/components/carousel";
import { AvatarGroup } from "@/components/user_avatar";
import { ReadMore } from "@/components/read_more";
import { ReflowTree } from "@/components/reflow_tree";

export function LinkMain() {
  return (
    <div className="max-w-6xl w-full flex flex-col self-center">
      <MobileHeader />
      <div className="flex flex-col gap-6 p-6">
        <h1 className="font-normal text-4xl">
          Help Jacob find his stolen bicycle
        </h1>
        <div className="flex flex-col md:flex-row gap-6">
          <Carousel>
            <Image
              src="/img/trek-520-grando-51cm-v0.jpeg"
              width={403.2}
              height={302.4}
              alt="Trek 520 Grando"
              className="rounded-box"
            />
            <Image
              src="/img/trek-520-grando-51cm-v0.jpeg"
              width={4032 / 2}
              height={3024 / 2}
              alt="Trek 520 Grando"
              className="w-auto object-contain"
            />
          </Carousel>
          <div className="card md:max-w-1/3 p-4 font-light bg-info text-info-content flex-col gap-4 flex">
            <div className="flex gap-4 flex-col items-start md:flex">
              <div className="flex flex-row gap-2 items-center">
                <AvatarGroup
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
                <p>
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
        <div className="flex flex-col md:flex-row gap-4">
          <ReadMore
            maxHeight="10rem"
            className="md:flex-2 card p-4 bg-base-100"
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
          <div className="md:flex-1 card p-4 bg-accent-content text-accent border-accent border self-stretch justify-center items-center">
            <ReflowTree />
          </div>
        </div>
      </div>
    </div>
  );
}
