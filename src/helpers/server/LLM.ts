"use server";

import OpenAI from "openai";
import { z } from "zod";
import { zodTextFormat } from "openai/helpers/zod";
import { defineServerFunction } from "./define_server_function";

// const defineServerFunction = (params: object) => {
//   return async () => {};
// };

const getTransliteratePrompt = (inputName: string) =>
  `
transliterate "${inputName}" as a sequence of ASCII characters.
OUTPUT ONLY THE TRANSLITERATION WITHOUT ANY EXTRA TEXT OR INFORMATION.
`;

export const transliterate = defineServerFunction({
  handler: async (inputName: string) => {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await openai.responses.create({
      model: "gpt-5-nano",
      input: getTransliteratePrompt(inputName),
    });
    return response.output_text;
  },
  id: "transliterate",
  scope: "global::llm",
});

const createQuestChatSystemPrompt = `
You are a coach helping the user clarify a quest — something they are searching for and want to describe clearly for their extended social circle. Your goal is to help them articulate what they are looking for and, if possible, identify which expertise, skills, or locations might make someone more likely to help. This enables their network to assist directly or refer the request to others.
🧭 Interaction Cycle
You must follow this exact cycle for every turn:
1️⃣ Clarify → Ask ONE clear question about the user’s quest.  - Multiple-choice questions are allowed.  - If multiple choice, put a blank line, then put every option in a new line starting with %%%%OB%%%% and ending with %%%%OE%%%%
2️⃣ Recap & Confirm → Every third message (or when unsure), recap what you’ve learned so far and ask for confirmation of understanding.
3️⃣ Respond briefly if the user is confused by your previous message.
Do exactly one of these three actions per turn.
🧱 Content Restrictions
Only ask about:
The description
Information that can be shared as plain text / Unicode characters
Do not ask for:
Photo
Document
Other media
Contact method
Reward or incentive
Permission for anything
Do not generate the final description or search plans, and do not suggest plans of action.
🪜 Output Format
After your main response, you must include the following block exactly as shown:
<your main message text here><four empty lines>CONFIDENCE: [ZERO | POOR | DOUBTFUL | GOOD | CONFIDENT | SURE] 
Confidence reflects how complete and real the gathered information is for generating a 3+ paragraph description:
ZERO: Mostly hallucinated text
POOR: Some real info but still mostly hallucinated
DOUBTFUL: Real info and hallucination are about equal
GOOD: Good real info, some hallucination
CONFIDENT: Great real info, little hallucination
SURE: Strong two-way correlation between info and generated description
If you ever forget to include the CONFIDENCE: block, treat your previous reply as invalid and correct yourself immediately.
🧩 Example
Example of correct output format,
Example1:
Got it! Could you tell me where you last saw the item?




CONFIDENCE: GOOD 
Example2:
What is the purpose of acquiring the item?

%%%%OB%%%% Research %%%%OE%%%%
%%%%OB%%%% Personal collection %%%%OE%%%%
%%%%OB%%%% Repairing my motor %%%%OE%%%%

CONFIDENCE: POOR
Example3:
So, you are looking for a donor with O- blood type in Birmangham. Am I correct?

CONFIDENCE: CONFIDENT

✨ Tone
Keep your tone positive, casual, and encouraging. Be concise and focus only on clarifying the user’s quest.
`;

export type CreateQuestChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const confidenceLevels = [
  "ZERO",
  "POOR",
  "DOUBTFUL",
  "GOOD",
  "CONFIDENT",
  "SURE",
] as const;

export type ConfidenceLevel = (typeof confidenceLevels)[number];

export type TextDeltaEvent = { type: "text-delta"; text: string };
export type OptionDeltaEvent = { type: "option-delta"; text: string };
export type SetConfidenceEvent = {
  type: "set-confidence";
  level: ConfidenceLevel;
};
export type ReasoningEvent = { type: "reasoning-part"; title: string };

export const createQuestChat = defineServerFunction({
  id: "createQuestChat",
  scope: "global::llm",
  handler: async function* (
    messages: CreateQuestChatMessage[],
  ): AsyncGenerator<
    ReasoningEvent | TextDeltaEvent | OptionDeltaEvent | SetConfidenceEvent,
    void,
    unknown
  > {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const input = [
      { role: "system" as const, content: createQuestChatSystemPrompt },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ];

    yield { type: "reasoning-part", title: "Thinking ..." };
    const stream = await openai.responses.create({
      model: "gpt-5-nano",
      input,
      reasoning: { effort: "low", summary: "detailed" },
      text: { format: { type: "text" } },
      stream: true,
    });

    let done = false;
    let deltaTextBuffer = "";
    let deltaReasonBuffer = "";

    const confidenceLevelRegExp = new RegExp(
      `(${confidenceLevels.join("|")})`,
      "si",
    );
    const createPermissivePattern = (str: string) =>
      str
        .split("")
        .map((c) => `(?:${c}|$)`)
        .join("");
    const confidenceEndingRegExp = new RegExp(
      `\n(${createPermissivePattern("CONFIDENCE:")}\\s*(${confidenceLevels
        .map((c) => createPermissivePattern(c))
        .join("|")}))[\\.\\;]?\\s*$`,
      "si",
    );
    const optionStartRegExp = new RegExp(
      `^${createPermissivePattern("%%%%OB%%%%")}`,
      "si",
    );

    for await (const event of stream) {
      switch (event.type) {
        case "response.output_text.delta": {
          deltaTextBuffer += event.delta;
          const confidenceEndingMatch = deltaTextBuffer.match(
            confidenceEndingRegExp,
          );
          let consumableText = deltaTextBuffer;
          deltaTextBuffer = "";
          if (confidenceEndingMatch && confidenceEndingMatch[0] !== "") {
            deltaTextBuffer = consumableText.slice(confidenceEndingMatch.index);
            consumableText = consumableText.slice(
              0,
              confidenceEndingMatch.index,
            );
            const confidenceLevelMatch = confidenceEndingMatch[1].match(
              confidenceLevelRegExp,
            );
            if (confidenceLevelMatch) {
              done = true;
              yield {
                type: "set-confidence",
                level: confidenceLevelMatch[1].toUpperCase(),
              } as SetConfidenceEvent;
            }
          }
          if (consumableText !== "") {
            const incompleteLines: string[] = [];
            for (const line of consumableText.split("\n")) {
              const optionMatch = line.match(/%%%%OB%%%%(.*?)%%%%OE%%%%/);
              if (optionMatch) {
                if (!/please specify/i.test(optionMatch[1])) {
                  yield {
                    type: "option-delta",
                    text: optionMatch[1].trim(),
                  } as OptionDeltaEvent;
                }
              } else {
                const optionStartMatch = line.match(optionStartRegExp);
                if (optionStartMatch && optionStartMatch[0] !== "") {
                  incompleteLines.push(line);
                } else
                  yield {
                    type: "text-delta",
                    text: line.replace(/%%%%O\w%%%%/g, ","),
                  } as TextDeltaEvent;
              }
            }
            deltaTextBuffer = incompleteLines.join("\n") + deltaTextBuffer;
          }
          break;
        }
        case "response.reasoning_summary_text.delta": {
          deltaReasonBuffer += event.delta;
          const m =
            deltaReasonBuffer.match(/\*\*\s*(.+?)\s*\*\*/) ??
            deltaReasonBuffer.match(/#+\s*(.+?)\s*\n/);
          if (m) {
            deltaReasonBuffer = "";
            yield { type: "reasoning-part", title: m[1] } as ReasoningEvent;
          }
        }
      }
      if (done) break;
    }
  },
});

const getQuestTitleAndDescriptionSystemPrompt = `
You are a concise copywriter.
Task:
— Read the conversation and infer exactly what the person is seeking.
— Produce:
   1) description: 1–4 paragraphs, plain language, specific, action-oriented, no fluff.
   2) title: 4–7 words, shown to the seeker; vivid, concrete, respectful.
   3) askTitle: 4–7 words, addressed to the seeker's friends/network; contains the seeker’s first name when natural.
Rules:
— Titles must be 4–7 words (count words, not characters).
— Avoid sensationalism; be clear and credible.
`;

export const getQuestTitleAndDescription = defineServerFunction({
  id: "getQuestTitleAndDescription",
  scope: "global::llm",
  handler: async (messasges: CreateQuestChatMessage[]) => {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await openai.responses.parse({
      model: "gpt-5-nano",
      reasoning: { effort: "minimal" },
      input: [
        { role: "system", content: getQuestTitleAndDescriptionSystemPrompt },
        {
          role: "user",
          content:
            "Return only the JSON. Here is the data:\n" +
            JSON.stringify(messasges, null, 2),
        },
      ],
      text: {
        format: zodTextFormat(
          z
            .object({
              title: z.string(),
              description: z.string(),
              askTitle: z.string(),
            })
            .strict(),
          "specs",
        ),
      },
    });
    return response.output_parsed;
  },
});

/*
const titleGenerationPrompt =
  'You are an expert on literature and psychology. The user will give you a passage and title. You have to generate one 4-7 word sentence to ask the reader of the sentence to help the writer of passage reach his/her goal. Try to include key points of the passage that may affect help. The input will be in JSON format. "name" field holding name of the writer of passage and "passage" indicating the content of the passage. The sentence should be in third person voice e.g. `Help Nolan recover his stolen totem` or `Aid Susan find her beloved cat (Maggy)` or `Stand with John in search for "Arabian Nights"';

const reasonGenerationPrompt =
  'Given a reason to pass a request from a friend of you to someone you know or a group of people you know, convert it to a SMALL paragraph length text from the third person perspective addressing the reader. If no reason is provided, generate a general paragraph that is true implicitly and make it explicit. Do not add any unspecified claims. e.g. "Because he is in the neighborhood and knows cars well" to "Because you are in the neighborhood and know cars." or "Because she has a large connection pool with painters and artists" to "As you have vast connections with painters and art people". For empty reasons for example "Because he thinks you can help Mat find his stolen car".';

const callForActionSentenceGenerationPrompt =
  'The user will give you a passage containing description of a request for help and title. Generate 4 4-7 word sentences and output a JSON array. First sentence checking with reader if he has the answer, lead and can directly help e.g. "If you know where to find it". Second checking with reader if he knows someone that MAY be able to help or even pass the word e.g. "If you know someone who may help". Third sentence encoraging to connect with the starter of quest and providing them with answer. And finally fourth to encourage passing the word via Reflow. Reflow is a term used in the application. The first two sentences must be INCOMPLETE and must NOT be questions.';
*/
