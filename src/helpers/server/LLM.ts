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
      reasoning: { effort: "minimal", summary: "detailed" },
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
You are an expert clarity assistant helping to summarize and reframe a user’s “quest” — something they are seeking, researching, or trying to achieve — based on a short chat transcript between the user and an assistant.

Your task:
Given the full chat transcript, infer the user’s main goal, motivation, and context, then produce a concise JSON object describing their quest.

### GUIDELINES

**description**  
- Write about 3 paragraphs in total.  
- Use third person (“Joseph is looking for…”, “Helena wants to…”).  
- Capture *why* they want it (motivation, curiosity, or purpose).  
- Explain *what exactly* they are seeking.  
- Mention any priorities, focus areas, or constraints.  
- End with a sense of direction or next step (“They hope that by finding X, they can Y…”).

**seekerTitle**  
- A short, inspiring title (max ~5 words).  
- For user, to easily remember what the quest is about summarizing their mission.  
- Example: "Rare 17th-Century Translation"

**contributorTitle**  
- A clear, friendly, and engaging title for others who might help.  
- Example: "Can You Help Malcom Find a 17th-Century English Arabian Nights?"

### INPUT

You’ll receive a transcript formatted like this:
name:
Malcom
user: <user messages>
bot: <assistant messages>
user: <user messages>
bot: <assistant messages>

Combine all relevant information from the user’s turns to infer intent and motivation.  
Ignore generic assistant prompts unless they clarify facts.

### OUTPUT EXAMPLE

\`\`\`json
{
  "description": "The user is seeking a 17th-century English translation of Arabian Nights. They are fascinated by how early translators adapted Asian cultural narratives into Western literary traditions. Their goal is to study how meaning, tone, and storytelling evolved through translation. By finding this rare edition, they hope to explore cultural exchange through language and contribute insights to historical translation research.",
  "seekerTitle": "17th-Century Arabian Nights",
  "contributorTitle": "Help Malcom Find a 17th-Century Arabian Nights"
}
\`\`\``;

const generatedDescriptionTitle = z
  .object({
    description: z
      .string()
      .min(30, "Description must be at least 30 characters long")
      .describe(
        "Around 3 paragraphs describing what the user is trying to do.",
      ),
    seekerTitle: z
      .string()
      .min(3, "Title must be at least 3 characters long")
      .max(120, "Title must be at most 120 characters long")
      .describe("A short title addressed to the user."),
    contributorTitle: z
      .string()
      .min(3, "Title must be at least 3 characters long")
      .max(120, "Title must be at most 120 characters long")
      .describe(
        "A short title addressed to friends or the public asking for help.",
      ),
  })
  .strict();

export type GeneratedTitleAndDescription = z.infer<
  typeof generatedDescriptionTitle
>;
export type GeneratedTitleAndDescriptionEvent = {
  type: "generated-title-and-description";
  value: GeneratedTitleAndDescription;
};

export const getQuestTitleAndDescription = defineServerFunction({
  id: "getQuestTitleAndDescription",
  scope: "global::llm",
  handler: async function* (
    conversation: string,
  ): AsyncGenerator<
    ReasoningEvent | GeneratedTitleAndDescriptionEvent,
    void,
    unknown
  > {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const input = [
      {
        role: "system" as const,
        content: getQuestTitleAndDescriptionSystemPrompt,
      },
      { role: "user" as const, content: conversation },
    ];

    yield { type: "reasoning-part", title: "Thinking ..." };
    const stream = await openai.responses.create({
      model: "gpt-5-nano",
      input,
      reasoning: { effort: "minimal", summary: "detailed" },
      text: {
        format: zodTextFormat(
          generatedDescriptionTitle,
          "generatedDescriptionTitle",
        ),
      },
      stream: true,
    });

    let deltaTextBuffer = "";
    let deltaReasonBuffer = "";

    for await (const event of stream) {
      switch (event.type) {
        case "response.output_text.delta": {
          deltaTextBuffer += event.delta;
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
    }

    const generated = generatedDescriptionTitle.safeParse(
      JSON.parse(deltaTextBuffer),
    );
    if (generated.success) {
      yield {
        type: "generated-title-and-description",
        value: generated.data,
      } as GeneratedTitleAndDescriptionEvent;
    }
  },
});
