"use client";

import { MobileHeader } from "@/components/mobile_header";
import type { SafeUser } from "@/helpers/server/auth";
import {
  LinkOverviewMedia,
  LinkOverviewEngagement,
  type LinkOverviewMediaItem,
  type LinkStatusInfo,
  type LinkInviterInfo,
  type LinkSubmitQuestion,
  type LinkActionLabels,
} from "./components/LinkOverviewSection";
import {
  LinkMotivatorAccordion,
  LinkRewardAccordion,
} from "./components/LinkAccordions";
import {
  LinkStoryContent,
  LinkReflowCard,
} from "./components/LinkStorySection";
import {
  LinkTimelineContent,
  LinkTimelineStats,
  type TimelineAction,
  type TimelineStat,
} from "./components/LinkTimelineSection";
import { LinkFooterSection } from "./components/LinkFooterSection";
import { LinkTitleSection } from "./components/LinkTitleSection";
import { QuestMedia } from "@/db/constants";

const QUEST_TITLE = "Help Jacob find his stolen bicycle";

const MEDIA_ITEMS: LinkOverviewMediaItem[] = [
  {
    id: "primary-photo",
    src: "https://pub-7027dcead7294deeacde6da1a50ed32f.r2.dev/trek-520-grando-51cm-v0.jpeg",
    width: 403.2,
    height: 302.4,
    alt: "Trek 520 Grando",
    className: "rounded-box",
  },
  {
    id: "secondary-photo",
    src: "https://pub-7027dcead7294deeacde6da1a50ed32f.r2.dev/trek-520-grando-51cm-v0.jpeg",
    width: 4032 / 2,
    height: 3024 / 2,
    alt: "Trek 520 Grando",
    className: "w-auto object-contain",
  },
];

const STATUS: LinkStatusInfo = {
  stage: "Withering",
  branchColor: "var(--color-amber-600, #22c55e)",
  leafColor: "var(--color-amber-300, #22c55e)",
  expiresInDays: 7,
};

const SUBMIT_QUESTIONS: LinkSubmitQuestion[] = [
  { question: "Some question", answerRequired: true },
  { question: "Some other question", answerRequired: false },
];

const ACTION_LABELS: LinkActionLabels = {
  reflow: "I know someone ...",
  submit: "I've seen it",
  bookmark: "I'll see later",
};

type MotivatorAccordionProps = Parameters<typeof LinkMotivatorAccordion>[0];
type RewardAccordionProps = Parameters<typeof LinkRewardAccordion>[0];

// Serialized snapshot of inviter details supplied by the server.
type SerializedInviter = {
  displayName: string;
  linkType: "targeted" | "broadcast";
  sameAsSeeker?: boolean;
  description?: string | null;
  avatars: Array<{
    name: string;
    imageUrl?: string | null;
    imageWidth?: number | null;
    imageHeight?: number | null;
  }>;
};

const MOTIVATOR_CONTENT: MotivatorAccordionProps = {
  title: <>🌺 Your action may be crucial</>,
  body: (
    <>
      <p>
        Out of the <b>300</b> individuals who have visited this quest,{" "}
        <b>only 10</b>😢 has taken action. The success of <i>HopeFlow</i> quests
        relies upon word being spread, so that those who hold the answers may be
        reached.
      </p>
      <p>
        <b>Your contribution</b> could be <b>the spark that helps</b>🌱 this
        quest tree flourish and draws forth the ones destined to respond 🌳😊.
      </p>
    </>
  ),
};

const QUEST_REWARD_CONTENT: RewardAccordionProps = {
  title: <>🕊️ Recompense ($425 max.)</>,
  body: (
    <>
      <p>
        <i>$950</i> has been allocated for the quest. If <i>you</i> solve it
        directly, you&apos;ll receive <b>half</b> which is <b>$425</b>.
      </p>
      <p>
        If your pass the word on, rewards then flow through a{" "}
        <b>recursive split 🌀</b>. The solver gets <b>½</b>; the referrer{" "}
        <b>¼</b>, the one before <b>⅛</b>... each step halving. Say you pass to
        your friend, whose aquintance provides the answer, you&apos;ll earn{" "}
        <b>⅛ = $106.25</b>.
      </p>
    </>
  ),
};

const STORY_PARAGRAPHS = [
  "My trek 520 grando was stolen last week. 51cm height. The red pusher pedals might help as well. Please let me know if you happen across one on your local online marketplace (anywhere in the US). If seen in public, please ask the owner politely where they bought it, and if you can see the serial number. It's WTU216LK0060R",
  "I am offering $20 dollars for each post of a Trek 520 Grando with the same color scheme in these photos as well as the exact same height (51 cm). Heights of 49, 50, 52, 53 will be rewarded $10. Can pay out reward with Paypal, Amazon gift cards, venmo, zelle or crypto. $300 bounty if my bike is found and an extra $200 if I manage to recover it.",
  "I have a lot of sentimental value in this bike. Mom passed shortly before our first child was born. We moved temporarily 1.5 hrs commute away to my in-laws and this trek helped me with the last 5 miles of the commute back from work.",
];

const TIMELINE_ACTIONS: TimelineAction[] = [
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
    description: "I hope you will find your bike and get it back safely.",
  },
  {
    name: "Behrooz",
    imageUrl: "/img/behrooz.jpeg",
    timestamp: new Date(1760525835746 - 12 * 60 * 60 * 1000),
    type: "reflowed the quest",
    description:
      "Saeed is in the neighborhood and knows bikes well. He likes to help people as much as I do",
  },
];

const TIMELINE_STATS: TimelineStat[] = [
  { id: "views", icon: "views", text: "150 people have seen this quest" },
  { id: "shares", icon: "shares", text: "10 people shared this quest" },
  { id: "leads", icon: "leads", text: "No one submitted any leads" },
  { id: "comments", icon: "comments", text: "Martha commented on the quest" },
];

type SeekerInfo = { name: string; avatarSrc: string };

export function LinkMain({
  title,
  description,
  seekerInfo,
  publishDate,
  coverMedia,
  user,
  inviter,
}: {
  title: string;
  description: string;
  seekerInfo: SeekerInfo;
  publishDate: Date;
  coverMedia: QuestMedia[];
  user?: SafeUser;
  inviter: SerializedInviter;
}) {
  // Normalize inviter messaging so the UI always has readable names and copy.
  const inviterName = inviter.displayName?.trim() || "Someone";
  const seekerName = seekerInfo.name?.trim() || "the quest owner";
  const samePerson = inviter.sameAsSeeker;
  const isTargeted = inviter.linkType === "targeted";
  const fallbackDescription = isTargeted
    ? samePerson
      ? `${inviterName} is inviting you directly to lend a hand.`
      : `${inviterName} believes you could help ${seekerName}.`
    : samePerson
      ? `${inviterName} is reaching out broadly for help with this quest.`
      : `${inviterName} is spreading the word to support ${seekerName}.`;
  const inviterDescription = inviter.description?.trim() || fallbackDescription;
  const inviterAvatarsSource = inviter.avatars.length
    ? inviter.avatars
    : [{ name: inviterName }];
  const messageCopy = (() => {
    if (isTargeted) {
      if (samePerson) {
        return <>shares this quest directly with you</>;
      }
      return (
        <>
          shares this with you on behalf of{" "}
          <span className="font-semibold">{seekerName}</span>
        </>
      );
    }
    if (samePerson) {
      return <>is sharing their quest with the community</>;
    }
    return (
      <>
        is amplifying this quest to help{" "}
        <span className="font-semibold">{seekerName}</span>
      </>
    );
  })();
  const inviterInfo: LinkInviterInfo = {
    avatars: inviterAvatarsSource.map(
      ({ name, imageUrl, imageWidth, imageHeight }) => ({
        name: name?.trim() || inviterName,
        imageUrl: imageUrl!,
        imageWidth: imageWidth ?? undefined,
        imageHeight: imageHeight ?? undefined,
      }),
    ),
    message: (
      <>
        <span className="font-semibold">{inviterName}</span> {messageCopy}
      </>
    ),
    description: inviterDescription,
  };

  const coverMediaItems = coverMedia.map<LinkOverviewMediaItem>(
    ({ url, width, height, alt, type }, index) => ({
      id: `cover-media-${index}`,
      src: url,
      width,
      height,
      alt,
      type,
    }),
  );
  const mediaItems = coverMediaItems.length ? coverMediaItems : [];
  console.log("length of mediaItems", mediaItems.length);
  return (
    <div className="flex w-full max-w-6xl flex-col self-center">
      <MobileHeader user={user} />
      <div className="flex flex-col gap-4 p-6 md:gap-6">
        <LinkTitleSection title={title} user={user} />
        <div className="flex flex-col gap-4 md:flex-row md:gap-6">
          <LinkOverviewMedia mediaItems={mediaItems} status={STATUS} />
          <LinkOverviewEngagement
            inviter={inviterInfo}
            submitQuestions={SUBMIT_QUESTIONS}
            actionLabels={ACTION_LABELS}
          />
        </div>
        <div className="flex flex-col items-start gap-6 md:flex-row">
          <LinkMotivatorAccordion {...MOTIVATOR_CONTENT} />
          <LinkRewardAccordion {...QUEST_REWARD_CONTENT} />
        </div>
        <div className="flex flex-col gap-4 md:flex-row md:gap-6">
          <LinkStoryContent description={description} />
          <LinkReflowCard />
        </div>
        <div className="flex flex-col items-start gap-4 md:flex-row md:gap-6">
          <LinkTimelineContent actions={TIMELINE_ACTIONS} />
          <LinkTimelineStats stats={TIMELINE_STATS} />
        </div>
        <LinkFooterSection
          name={seekerInfo.name}
          avatarSrc={seekerInfo.avatarSrc}
          date={publishDate}
        />
      </div>
    </div>
  );
}
