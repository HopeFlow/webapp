import { z, ZodError } from "zod";

/** --- Common helpers --- */

// Throw a ZodError that "feels" like .parse() failures
function zodFail(message: string, path: (string | number)[] = []): never {
  throw new ZodError([
    {
      code: "custom",
      message,
      path,
    },
  ]);
}

// Try parsing `u` with schema `S`, but if it looks like an API error object,
// convert it to a ZodError with the server's message.
function parseOrZod<S extends z.ZodTypeAny>(schema: S, u: unknown, path: (string | number)[] = []) {
  // If it looks like { error: { message } }, surface it as a ZodError
  const errRes = ErrorResponseSchema.safeParse(u);
  if (errRes.success) {
    const msg = errRes.data.error.message || "Unknown AI error";
    zodFail(msg, path);
  }

  // Otherwise validate the expected shape
  const parsed = schema.safeParse(u);
  if (!parsed.success) {
    // Re-throw the exact ZodError to preserve error formatting & paths
    throw parsed.error;
  }
  return parsed.data as z.infer<S>;
}

/** --- Error response (Cloudflare/OpenAI-compatible) --- */
export const ErrorResponseSchema = z.object({
  error: z.object({
    message: z.string().default(""),
    code: z.union([z.string(), z.number()]).optional(),
    type: z.string().optional(),
    param: z.unknown().optional(),
  }),
});

/** --- Message content parts (keep broad) --- */
const CfChatRole = z.enum(["system", "user", "assistant", "tool", "function"]);

const CfChatCompletionContentPartSchema = z.union([
  z.object({ type: z.literal("text"), text: z.string() }),
  z.object({
    type: z.literal("image_url"),
    image_url: z.union([
      z.string(),
      z.object({
        url: z.string(),
        detail: z.enum(["low", "high", "auto"]).optional(),
      }),
    ]),
  }),
]);

/** --- Assistant message (non-stream) --- */
const AssistantMessageSchema = z.object({
  role: z.literal("assistant"),
  content: z.union([z.string(), z.null()]), // CF compat: may be null in some cases
  refusal: z.any().nullable().optional(),
  annotations: z.any().nullable().optional(),
  audio: z.any().nullable().optional(),
  function_call: z.any().nullable().optional(),
  tool_calls: z.array(z.any()).default([]),
  reasoning_content: z.string().optional().nullable(),
});

/** --- Choice (non-stream) --- */
const FinishReason = z.enum(["stop", "length", "content_filter", "tool_calls"]).nullable().optional();

const ChoiceSchema = z.object({
  index: z.number(),
  message: AssistantMessageSchema,
  logprobs: z.any().nullable().optional(),
  finish_reason: FinishReason,
  stop_reason: z.string().nullable().optional(), // some providers include this
});

/** --- Usage (tokens) --- */
const UsageSchema = z.object({
  prompt_tokens: z.number(),
  completion_tokens: z.number(),
  total_tokens: z.number(),
}).partial().transform((u) => u); // some providers omit fields

/** --- ChatCompletion (non-stream) --- */
export const CfChatCompletionSchema = z.object({
  id: z.string(),
  object: z.literal("chat.completion"),
  created: z.number(),
  model: z.string(),
  choices: z.array(ChoiceSchema).min(1),
  usage: UsageSchema.optional(),
});

/** --- Streaming chunk --- */
// Delta format: OpenAI-compatible
const DeltaSchema = z.object({
  role: CfChatRole.optional(),
  content: z.string().optional(),
  // tolerate vendor extras:
}).passthrough();

const StreamChoiceSchema = z.object({
  index: z.number(),
  delta: DeltaSchema.optional(),            // normal token chunks
  message: AssistantMessageSchema.optional(), // some vendors send full message snapshots
  logprobs: z.any().nullable().optional(),
  finish_reason: FinishReason,
  stop_reason: z.string().nullable().optional(),
});

export const CfChatCompletionChunkSchema = z.object({
  id: z.string(),
  object: z.literal("chat.completion.chunk"),
  created: z.number(),
  model: z.string(),
  choices: z.array(StreamChoiceSchema).min(1),
  usage: UsageSchema.optional(),
}).passthrough();

/** --- Request params (lightly validated at runtime) --- */
export const CfOpenAIChatCreateParamsSchema = z.object({
  model: z.string(),
  messages: z.array(
    z.object({
      role: CfChatRole,
      content: z.union([z.string(), z.array(CfChatCompletionContentPartSchema)]),
      name: z.string().optional(),
    }),
  ),
  stream: z.literal(false).optional(),
}).passthrough();

export const CfOpenAIChatCreateParamsStreamingSchema =
  CfOpenAIChatCreateParamsSchema.extend({ stream: z.literal(true) });

export async function* SseToGenerator(
  response: Response,
): AsyncGenerator<{ event?: string; data: string; id?: string }, void, unknown> {
  if (!response.body) zodFail("No response body to read (SSE).");

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // Split on blank line (SSE delimiter). Support both \n\n and \r\n\r\n
    let start = 0;
    while (true) {
      const sepN = buffer.indexOf("\n\n", start);
      const sepR = buffer.indexOf("\r\n\r\n", start);
      const sep = sepR !== -1 && (sepN === -1 || sepR < sepN) ? sepR : sepN;
      if (sep === -1) {
        buffer = buffer.slice(start);
        break;
      }
      const block = buffer.slice(start, sep);
      start = sep + (sep === sepR ? 4 : 2);

      const evt = parseSSEBlock(block);
      if (evt) yield evt;
    }
  }

  // Flush any trailing block (no final blank line)
  if (buffer.trim().length) {
    const evt = parseSSEBlock(buffer);
    if (evt) yield evt;
  }

  function parseSSEBlock(block: string) {
    const lines = block.split(/\r?\n/);
    let event: string | undefined;
    let id: string | undefined;
    const dataLines: string[] = [];

    for (const raw of lines) {
      if (!raw || raw.startsWith(":")) continue;
      const idx = raw.indexOf(":");
      const field = idx === -1 ? raw : raw.slice(0, idx);
      const value = idx === -1 ? "" : raw.slice(idx + 1).replace(/^ /, "");
      switch (field) {
        case "event":
          event = value;
          break;
        case "data":
          dataLines.push(value);
          break;
        case "id":
          id = value;
          break;
      }
    }

    if (dataLines.length === 0) return null;
    return { event, id, data: dataLines.join("\n") };
  }
}

// Type imports you already have:
type CfChatCompletion = z.infer<typeof CfChatCompletionSchema>;
type CfChatCompletionChunk = z.infer<typeof CfChatCompletionChunkSchema>;
type CfOpenAIChatCreateParams = z.infer<typeof CfOpenAIChatCreateParamsSchema>;
type CfOpenAIChatCreateParamsStreaming = z.infer<typeof CfOpenAIChatCreateParamsStreamingSchema>;

export function getLLMResponse(
  params: CfOpenAIChatCreateParamsStreaming,
): Promise<AsyncGenerator<CfChatCompletionChunk, void, unknown>>;
export function getLLMResponse(
  params: CfOpenAIChatCreateParams,
): Promise<CfChatCompletion>;

export async function getLLMResponse(
  params: CfOpenAIChatCreateParams | CfOpenAIChatCreateParamsStreaming,
) {
  // Validate params first; also decides which schema to use
  const isStreaming = !!(params as any)?.stream;
  const parsedParams = isStreaming
    ? parseOrZod(CfOpenAIChatCreateParamsStreamingSchema, params, ["params"])
    : parseOrZod(CfOpenAIChatCreateParamsSchema, params, ["params"]);

  const baseUrl = `https://gateway.ai.cloudflare.com/v1/${process.env.CLOUDFLARE_ACCOUNT_ID}/hopeflow/compat/chat/completions`;
  const headersCommon = {
    Authorization: `Bearer ${process.env.CLOUDFLARE_HOPEFLOW_TOKEN ?? ""}`,
    "cf-aig-authorization": `Bearer ${process.env.CLOUDFLARE_HOPEFLOW_TOKEN ?? ""}`,
    "Content-Type": "application/json",
  };

  // STREAMING
  if (isStreaming) {
    const response = await fetch(baseUrl, {
      method: "POST",
      headers: { ...headersCommon, Accept: "text/event-stream" },
      body: JSON.stringify({ ...parsedParams, input: "" }),
    });

    if (!response.ok) {
      let bodyText: string;
      try {
        bodyText = await response.text();
      } catch {
        bodyText = response.statusText;
      }
      zodFail(`HTTP ${response.status}: ${bodyText}`, ["http"]);
    }

    // Return a typed async generator; every JSON event is validated
    return (async function* () {
      for await (const { data } of SseToGenerator(response)) {
        if (data === "[DONE]") break;

        let chunkUnknown: unknown;
        try {
          chunkUnknown = JSON.parse(data);
        } catch {
          zodFail("Malformed SSE JSON chunk", ["stream", "chunk"]);
        }

        // If server sent an error frame mid-stream, convert to ZodError
        const errProbe = ErrorResponseSchema.safeParse(chunkUnknown);
        if (errProbe.success) {
          const msg = errProbe.data.error.message || "Unknown AI error";
          zodFail(msg, ["stream"]);
        }

        const chunk = parseOrZod(CfChatCompletionChunkSchema, chunkUnknown, ["stream"]);
        yield chunk;
      }
    })();
  }

  // NON-STREAMING
  const response = await fetch(baseUrl, {
    method: "POST",
    headers: { ...headersCommon, Accept: "application/json" },
    body: JSON.stringify({ ...parsedParams, input: "" }),
  });

  if (!response.ok) {
    let bodyText: string;
    try {
      bodyText = await response.text();
    } catch {
      bodyText = response.statusText;
    }
    zodFail(`HTTP ${response.status}: ${bodyText}`, ["http"]);
  }

  const json: unknown = await response.json();

  // If it's an error payload, this throws a ZodError; else validates completion
  const completion = parseOrZod(CfChatCompletionSchema, json, ["response"]);
  return completion;
}

const TransliterationSchema = z.object({
  ascii: z.string().min(1, "ascii must be a non-empty string"),
});

export const transliterate = async (inputName: string) => {
  const prompt =
    `transliterate this name to ascii characters: ${inputName}. ` +
    `The output should be a json with following format: {"ascii": "name in ascii"}`;

  const output = await getLLMResponse({
    model: "workers-ai/@cf/openai/gpt-oss-20b",
    messages: [{ role: "user", content: prompt }],
    // stream: false (implicit)
  });

  // pick the first non-null content
  const content = output.choices
    .map((c) => c.message.content)
    .find((c): c is string => typeof c === "string" && c.length > 0);

  if (!content) {
    zodFail("Assistant returned empty content", ["choices", 0, "message", "content"]);
  }

  let jsonUnknown: unknown;
  try {
    jsonUnknown = JSON.parse(content);
  } catch {
    zodFail("Assistant content is not valid JSON", ["choices", 0, "message", "content"]);
  }

  const parsed = parseOrZod(TransliterationSchema, jsonUnknown, ["assistant-json"]);
  return parsed.ascii;
};

export const titleGenerationPrompt =
  'You are an expert on literature and psychology. The user will give you a passage and title. You have to generate one 4-7 word sentence to ask the reader of the sentence to help the writer of passage reach his/her goal. Try to include key points of the passage that may affect help. The input will be in JSON format. "name" field holding name of the writer of passage and "passage" indicating the content of the passage. The sentence should be in third person voice e.g. `Help Nolan recover his stolen totem` or `Aid Susan find her beloved cat (Maggy)` or `Stand with John in search for "Arabian Nights"';

export const reasonGenerationPrompt =
  'Given a reason to pass a request from a friend of you to someone you know or a group of people you know, convert it to a SMALL paragraph length text from the third person perspective addressing the reader. If no reason is provided, generate a general paragraph that is true implicitly and make it explicit. Do not add any unspecified claims. e.g. "Because he is in the neighborhood and knows cars well" to "Because you are in the neighborhood and know cars." or "Because she has a large connection pool with painters and artists" to "As you have vast connections with painters and art people". For empty reasons for example "Because he thinks you can help Mat find his stolen car".';

export const callForActionSentenceGenerationPrompt =
  'The user will give you a passage containing description of a request for help and title. Generate 4 4-7 word sentences and output a JSON array. First sentence checking with reader if he has the answer, lead and can directly help e.g. "If you know where to find it". Second checking with reader if he knows someone that MAY be able to help or even pass the word e.g. "If you know someone who may help". Third sentence encoraging to connect with the starter of quest and providing them with answer. And finally fourth to encourage passing the word via Reflow. Reflow is a term used in the application. The first two sentences must be INCOMPLETE and must NOT be questions.';
