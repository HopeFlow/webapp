"use server";

import OpenAI from "openai";
import { z } from "zod";
import { zodTextFormat } from "openai/helpers/zod";
import { defineServerFunction } from "./define_server_function";

// #region preamble

// const defineServerFunction = (params: object) => {
//   return async () => {};
// };

if (!process.env.OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY is not set");
}
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// #endregion

// #region Transliterate

const getTransliteratePrompt = (inputName: string) => `
Transliterate the following name as ASCII-only characters.
Return only the transliteration, no quotes, no extra text.

Name: ${JSON.stringify(inputName)}
`;

export const transliterate = defineServerFunction({
  handler: async (inputName: string) => {
    const response = await openai.responses.create({
      model: "gpt-5-nano",
      input: getTransliteratePrompt(inputName),
    });
    return response.output_text;
  },
  id: "transliterate",
  scope: "global::llm",
});

// #endregion

// #region general LLM helpers

export type ReasoningEvent = { type: "reasoning-part"; title: string };

async function* streamProxy<E extends OpenAI.Responses.ResponseStreamEvent>(
  stream: AsyncIterable<E, void, unknown>,
) {
  let deltaReasonBuffer = "";
  for await (const event of stream) {
    switch (event.type) {
      case "response.reasoning_summary_text.delta": {
        deltaReasonBuffer += event.delta;
        const m =
          deltaReasonBuffer.match(/\*\*\s*(.+?)\s*\*\*/) ??
          deltaReasonBuffer.match(/#+\s*(.+?)\s*\n/);
        if (m) {
          deltaReasonBuffer = "";
          yield { type: "reasoning-part", title: m[1] } as ReasoningEvent;
        }
        break;
      }
      case "error":
        throw new Error(event.message);
      default:
        yield event;
    }
  }
}

// #endregion

// #region Create Quest Chat

export type CreateQuestChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type ConfidenceLevel =
  | "ZERO"
  | "POOR"
  | "DOUBTFUL"
  | "GOOD"
  | "CONFIDENT"
  | "SURE";

export type TextDeltaEvent = { type: "text-delta"; text: string };
export type OptionDeltaEvent = {
  type: "option-delta";
  text: string;
  confirmation?: boolean;
};
export type UpdateQuestIntentStateEvent = {
  type: "update-quest-intent-state";
  questIntentState: QuestIntentState;
};
export type SetConfidenceEvent = {
  type: "set-confidence";
  level: ConfidenceLevel;
};

const updateQuestIntentStateSystemPrompt = `
You are an expert psychologist and sociologist. User will mix a summary of previous chat and a new message
in a single message.

Task:
1. Summarize the text. Keep important information. Consider the text as a whole.
2. Rate the summary with these booleans:
   - clear: purpose is clear
   - noAmbiguity: free of ambiguity
   - understandable: easy to understand
   - comprehensible: meaning fully graspable
   - concise: gives a relatable picture fully transparent
   - adequate: enough info to understand the purpose and individuals that can help
   - sufficient: enough data for reader to feel the situation and personality of ones more probably can help
   - covering: covers enough details to create a vivid picture of what is sought and who can help
   - complete: fully states the intended purpose and what people can help most

One-shot example:
Input:
User wants to find a lost bicycle\n\nIt was stolen last night
Output:
{
  "summary": "User wants to find a lost bicycle stolen last night",
  "clear": true,
  "noAmbiguity": true,
  "understandable": true,
  "comprehensible": true,
  "concise": true,
  "adequate": false,
  "sufficient": false,
  "covering": false,
  "complete": false
}

Now process the actual input and return only the JSON object.
`.trim();

const generateClarifyingQuestionsSystemPrompt = `
You help user clearly express his goal. You are not going to help user with his goal, just help him/her express it clearly.

Input:
{
  "summary": string, // What we know from user's chat
  "issues": {
    "ambiguous": bool, // Goal is not completely clear
    "missingInfo": bool, // Additional info can help people better understand user's goal or feel who will more probably be able to help
  },
  "clarityLabel": "ZERO"|"POOR"|"DOUBTFUL"|"GOOD"|"CONFIDENT"|"SURE"
}

Rules:
- ONE overall clarifying question unless the state is crystal clear.
- Crystal clear = clarityLabel=="SURE" or clarityLabel=="CONFIDENT" AND issues.ambiguous==false AND issues.missingInfo==false.
- A question may have parts but must end as one question.
- Add <option>...</option> (short answers) wherever obvious. Each option in ITS OWN LINE
- No "other" <option>s. In these cases add a sentence after options meaning "if it is something else, write it yourself"
- If crystal clear: give 1-sentence recap, then on new lines: <accept/> and <reject/>.
- No explanations. Output only the question+options OR recap+accept/reject.

One-shot examples:
(1) Example: ambiguous → ask question with options
Input:
{ "summary":"User is seeking a possible donor", "issues":{"ambiguous":true,"missingInfo":true}, "clarityLabel":"POOR" }
Output:
What kind of donation are you looking for?
<option>Biological Donor</option>
<option>Financial Donor</option>
<option>In-Kind Donor</option>
Something else? write it down.

(2) Example: ambiguous → ask question with options
Input:
{ "summary":"User is seeking a physical copy of Dante's purgatory", "issues":{"ambiguous":false,"missingInfo":true}, "clarityLabel":"GOOD" }
Output:
What happens if you find someone who has access?
<option>Borrow the book</option>
<option>Buy it</option>

(3) Example: ambiguous → ask question with options
Input:
{ "summary":"User is seeking a physical copy of Dante's purgatory to borrow", "issues":{"ambiguous":false,"missingInfo":true}, "clarityLabel":"POOR" }
Output:
What do you want to do with the book?
<option>Compare to a contemporary translation</option>
<option>Analyse physical condition of the books that old</option>
Or may be something completely different. Describe it!

(4) Example: missing info → ask question (no options needed)
Input:
{ "summary":"User wants help researching on a 17th century literary work", "issues":{"ambiguous":false,"missingInfo":true}, "clarityLabel":"POOR" }
Output:
Is it a novel or a play? Or something else?

(5) Example: crystal clear → recap + accept/reject
Input:
{ "summary":"User wants guidance on renewing their German passport from someone who recently had similar experience", "issues":{"ambiguous":false,"missingInfo":false}, "clarityLabel":"CONFIDENT" }
Output:
Lets recap. You want to renew your passport and seek guidance from someone who has recently done that. Correct?
<accept/>
<reject/>
`.trim();

const questIntentStateSchema = z.object({
  summary: z.string(),
  clear: z.boolean(),
  noAmbiguity: z.boolean(),
  understandable: z.boolean(),
  comprehensible: z.boolean(),
  concise: z.boolean(),
  adequate: z.boolean(),
  sufficient: z.boolean(),
  covering: z.boolean(),
  complete: z.boolean(),
});

export type QuestIntentState = z.infer<typeof questIntentStateSchema>;

export const createQuestChat = defineServerFunction({
  id: "createQuestChat",
  scope: "global::llm",
  handler: async function* (
    previousState: QuestIntentState | null,
    newUserMessage: string,
  ): AsyncGenerator<
    | TextDeltaEvent
    | OptionDeltaEvent
    | SetConfidenceEvent
    | ReasoningEvent
    | UpdateQuestIntentStateEvent,
    void,
    unknown
  > {
    // 1) Update quest intent state
    yield { type: "reasoning-part", title: "Updating quest intent state..." };

    const updateIntentStateStream = openai.responses.stream({
      model: "gpt-5-mini",
      // temperature: 0,
      reasoning: { effort: "low", summary: "auto" },
      text: {
        format: zodTextFormat(questIntentStateSchema, "questIntentState"),
        verbosity: "medium",
      },
      input: [
        { role: "system", content: updateQuestIntentStateSystemPrompt },
        {
          role: "user",
          content: `${previousState?.summary ?? ""}\n\n${newUserMessage}`,
        },
      ],
      store: false,
      stream: true,
    });

    for await (const event of streamProxy(updateIntentStateStream)) {
      if (event.type === "reasoning-part") {
        yield event;
      }
    }

    const updatedState = (await updateIntentStateStream.finalResponse())
      .output_parsed;
    if (!updatedState) {
      throw new Error("Failed to update QuestIntentState");
    }

    yield { type: "update-quest-intent-state", questIntentState: updatedState };

    const clarity = ((score): ConfidenceLevel => {
      if (score <= 0.12) return "ZERO";
      if (score <= 0.25) return "POOR";
      if (score <= 0.5) return "DOUBTFUL";
      if (score <= 0.7) return "GOOD";
      if (score <= 0.9) return "CONFIDENT";
      return "SURE";
    })(
      [
        updatedState.clear,
        updatedState.noAmbiguity,
        updatedState.understandable,
        updatedState.comprehensible,
        updatedState.concise,
        updatedState.adequate,
        updatedState.sufficient,
        updatedState.covering,
        updatedState.complete,
      ].filter(Boolean).length / 9,
    );
    yield { type: "set-confidence", level: clarity };

    // 3) Generate clarifying question + options
    yield {
      type: "reasoning-part",
      title: "Generating clarifying question...",
    };

    const generateQuestionsStream = openai.responses.stream({
      model: "gpt-5-nano",
      // temperature: 0.7,
      reasoning: { effort: "low", summary: "auto" },
      text: { verbosity: "medium" },
      store: false,
      input: [
        { role: "system", content: generateClarifyingQuestionsSystemPrompt },
        {
          role: "user",
          content: JSON.stringify({
            questIntentState: updatedState,
            newUserMessage,
            clarity,
          }),
        },
      ],
      stream: true,
    });

    let lineBuffer = "";
    for await (const event of streamProxy(generateQuestionsStream)) {
      switch (event.type) {
        case "reasoning-part": {
          yield event;
          break;
        }
        case "response.output_text.delta": {
          const delta: string = event.delta ?? "";
          if (!delta) break;

          lineBuffer += delta;
          if (lineBuffer.indexOf("accept") !== -1) {
          }

          const lines = lineBuffer.split("\n");
          for (const line of lines.slice(0, -1)) {
            const trimmed = line.trim();
            if (/^<option>.*<\/option>$/.test(trimmed.toLowerCase())) {
              yield { type: "option-delta", text: trimmed.slice(8, -9).trim() };
            } else if (trimmed.toLowerCase() === "<accept/>") {
              yield {
                type: "option-delta",
                text: "Accept",
                confirmation: true,
              };
            } else if (trimmed.toLowerCase() === "<reject/>") {
              yield {
                type: "option-delta",
                text: "Reject",
                confirmation: true,
              };
            } else {
              yield { type: "text-delta", text: trimmed + "\n" };
            }
          }
          if (
            lines.length > 0 &&
            !"<option>".startsWith(lines.at(-1)!.trim().slice(0, 8)) &&
            !"<accept/".startsWith(lines.at(-1)!.trim().slice(0, 8)) &&
            !"<reject/".startsWith(lines.at(-1)!.trim().slice(0, 8))
          ) {
            // Do not trim the last line as it may be a part of a larger line and
            // spaces between words may be significant
            yield { type: "text-delta", text: lines.at(-1)! };
            lineBuffer = "";
          } else lineBuffer = lines.at(-1) ?? "";
        }
      }
    }
    if (lineBuffer.length > 0) {
      const trimmed = lineBuffer.trim();
      // Only trim the end as beginning spaces might be significant
      if (/^\s*<option>.*<\/option>\s*$/.test(trimmed.toLowerCase())) {
        yield { type: "option-delta", text: trimmed.slice(8, -9).trim() };
      } else if (trimmed.toLowerCase() === "<accept/>") {
        yield { type: "option-delta", text: "Accept", confirmation: true };
      } else if (trimmed.toLowerCase() === "<reject/>") {
        yield { type: "option-delta", text: "Reject", confirmation: true };
      } else {
        yield { type: "text-delta", text: lineBuffer };
      }
    }
  },
});

// #endregion

// #region Generate Title and Description for Quest

const getQuestTitleAndDescriptionSystemPrompt = `
Generate a quest description and two titles from the provided QuestIntentState.

Rules:
- Description: at least two paragraphs; clear, engaging, faithful to the state; NO INVENTED FACTS.
- UserTitle: max 8 words, direct, describes what the user seeks.
- PublicTitle: max 8 words, addressed to helpers (e.g., “Help <name> …”).
- Stay concise and factual; follow style and emotional tone from writingFeatures.

Output only this JSON:
{
  "description": "...",
  "seekerTitle": "...",
  "contributorTitle": "..."
}
`.trim();

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
    nameOfUser: string,
    questIntentState: QuestIntentState,
  ): AsyncGenerator<
    ReasoningEvent | GeneratedTitleAndDescriptionEvent,
    void,
    unknown
  > {
    yield {
      type: "reasoning-part",
      title: "Generating title and description...",
    };
    const generateTitleDescriptionStream = openai.responses.stream({
      model: "gpt-5-nano",
      // temperature: 0.7,
      reasoning: { effort: "low", summary: "auto" },
      text: {
        format: zodTextFormat(
          generatedDescriptionTitle,
          "generatedTitleAndDescription",
        ),
        verbosity: "medium",
      },
      input: [
        { role: "system", content: getQuestTitleAndDescriptionSystemPrompt },
        {
          role: "user",
          content: JSON.stringify({ nameOfUser, ...questIntentState }),
        },
      ],
      stream: true,
    });
    for await (const event of streamProxy(generateTitleDescriptionStream))
      if (event.type === "reasoning-part") yield event;
    const result = (await generateTitleDescriptionStream.finalResponse())
      .output_parsed;
    if (!result) {
      throw new Error("Failed to generate title and description");
    }
    yield { type: "generated-title-and-description", value: result };
  },
});

// #endregion
