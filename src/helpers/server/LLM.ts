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
You are an expert counselor who helps people clarify what they are looking for so they can efficiently leverage their social connections to find it.
The user will describe what they are searching for. Do the following:
1. Decide if the information so far is sufficient for another person to clearly understand the user's need.
2. Consider a few possible clarifying questions.
3. Ask exactly ONE best clarifying question (short and specific).
4. If the quest is crystal clear, generate no questions and just report that the quest is clear
IMPORTANT:
- Follow each message  with four (4) empty lines and then a number between 0 and 100. This number designates a clarity score.
- The tool is logging-only. Do NOT wait for any response from it
`;

export type CreateQuestChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type TextDeltaEvent = { type: "text-delta"; text: string };
type SetClarityEvent = { type: "set-clarity"; level: number };
type ReasoningEvent = { type: "reasoning-part"; title: string };

export const createQuestChat = defineServerFunction({
  id: "createQuestChat",
  scope: "global::llm",

  handler: async function* (
    messages: CreateQuestChatMessage[],
  ): AsyncGenerator<
    ReasoningEvent | TextDeltaEvent | SetClarityEvent,
    void,
    unknown
  > {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const input = [
      { role: "system" as const, content: createQuestChatSystemPrompt },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ];

    const stream = await openai.responses.create({
      model: "gpt-5-nano",
      input,
      reasoning: { effort: "low", summary: "detailed" },
      text: { format: { type: "text" } },
      stream: true,
    });

    yield { type: "reasoning-part", title: "Thinking to better be at service" };
    let populatedText = "";
    let populatedReasoning = "";
    let consumedLength = 0;
    for await (const event of stream) {
      let done = false;
      switch (event.type) {
        case "response.output_text.delta": {
          populatedText += event.delta;
          const m = populatedText.match(/^(.*)(?:\s*\n){4,}(\d+)$/);
          if (m) {
            done = true;
            const delta = m[1].slice(consumedLength);
            if (delta) yield { type: "text-delta", text: delta };
            yield { type: "set-clarity", level: parseInt(m[2]) };
            break;
          } else {
            const delta = populatedText.slice(consumedLength);
            if (!/^[\s\n]+$/.test(delta)) {
              yield { type: "text-delta", text: event.delta };
              consumedLength = populatedText.length;
            }
          }
          break;
        }
        case "response.reasoning_summary_text.delta": {
          populatedReasoning += event.delta;
          const m =
            populatedReasoning.match(/\*\*\s*(.+?)\s*\*\*/) ??
            populatedReasoning.match(/#+\s*(.+?)\s*\n/);
          if (m) {
            populatedReasoning = "";
            yield { type: "reasoning-part", title: m[1] };
          }
          break;
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
