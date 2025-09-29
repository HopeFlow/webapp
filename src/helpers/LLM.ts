// ---------- Message content parts (OpenAI-compatible) ----------
export type CfChatRole = "system" | "user" | "assistant" | "tool" | "function";

/** Multimodal content parts (text + optional image_url support).
 *  Many OSS models on CF are text-only; keep the type broad but use text in practice. */
export type CfChatCompletionContentPart =
  | { type: "text"; text: string }
  | {
      type: "image_url";
      image_url: string | { url: string; detail?: "low" | "high" | "auto" };
    };

// ---------- Messages you send ----------
export type CfChatCompletionMessageParam =
  | {
      role: "system" | "user";
      content: string | CfChatCompletionContentPart[];
    }
  | {
      // Assistant messages you echo back (e.g., with tool_calls)
      role: "assistant";
      content?: string | CfChatCompletionContentPart[] | null;
      tool_calls?: CfChatCompletionMessageToolCall[];
      function_call?: CfChatCompletionMessageFunctionCall | null; // legacy
    }
  | {
      // Tool result you pass back to the model
      role: "tool";
      content: string; // tool output (as text/JSON string)
      tool_call_id: string; // id from prior assistant.tool_calls
    }
  | {
      // Legacy function result message (rare)
      role: "function";
      name: string;
      content?: string | null;
    };

// ---------- Tools (function calling) ----------
export interface CfChatCompletionMessageFunctionCall {
  name: string;
  arguments: string; // JSON string
}

export interface CfChatCompletionMessageToolCall {
  id: string;
  type: "function";
  function: CfChatCompletionMessageFunctionCall;
}

// Define the tool "schema" you offer the model
export interface CfChatCompletionTool {
  type: "function";
  function: {
    name: string;
    description?: string;
    /** JSON Schema per OpenAI spec. Keep it as a generic object. */
    parameters?: Record<string, unknown>;
    /** Some providers honor `strict` for tighter schema adherence */
    strict?: boolean;
  };
}

// tool_choice per OpenAI spec
export type CfChatCompletionToolChoice =
  | "auto"
  | "none"
  | { type: "function"; function: { name: string } };

// ---------- Request (non-streaming OR streaming) ----------
export interface CfOpenAIChatCreateBase {
  /** Cloudflare model id, e.g. "@cf/openai/gpt-oss-20b" */
  model: string;
  /** Conversation so far */
  messages: CfChatCompletionMessageParam[];

  // Sampling / decoding
  temperature?: number; // default model-dependent
  top_p?: number; // nucleus sampling
  max_tokens?: number; // cap on output length
  presence_penalty?: number; // -2..2
  frequency_penalty?: number; // -2..2

  // Stopping / multi-output / seeding
  stop?: string | string[];
  n?: number; // multiple choices; some providers may ignore
  seed?: number; // reproducibility (provider-dependent)

  // Logprobs (OpenAI supports; availability varies)
  logprobs?: boolean;
  /** 0..20 when logprobs=true */
  top_logprobs?: number;

  // Tools & legacy functions
  tools?: CfChatCompletionTool[];
  tool_choice?: CfChatCompletionToolChoice;
  functions?: Array<{
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
  }>;
  function_call?: "none" | "auto" | { name: string };

  // Misc
  user?: string;

  // Response shaping (JSON mode in Chat Completions)
  response_format?: { type: "text" } | { type: "json_object" }; // JSON mode (schema-based JSON is often Responses API)
}

/** Non-streaming request (default) */
export interface CfOpenAIChatCreateParams extends CfOpenAIChatCreateBase {
  stream?: false | undefined;
}

/** Streaming request (SSE) */
export interface CfOpenAIChatCreateParamsStreaming
  extends CfOpenAIChatCreateBase {
  stream: true;
}

// --- Model run results, OpenAI-compatible unions (non-streaming) ---
export type CfChatCompletionFinishReason =
  | "stop"
  | "length"
  | "content_filter"
  | "tool_calls"; // per OpenAI Chat Completions spec

// Cloudflare sometimes returns this alongside finish_reason; OpenAI doesn't.
export type CfStopReason =
  | "stop_sequence"
  | "max_tokens"
  | "content_filter"
  | string
  | null;

// --- Core result types ---
export interface CfChatCompletion {
  id: string;
  object: "chat.completion";
  created: number; // unix seconds
  model: string; // e.g. "@cf/openai/gpt-oss-20b"
  choices: CfChatCompletionChoice[];
  usage?: CfCompletionUsage;
}

export interface CfChatCompletionChoice {
  index: number;
  message: CfChatCompletionMessage;
  logprobs?: CfChatCompletionLogprobs | null; // matches OpenAI shape when requested
  finish_reason: CfChatCompletionFinishReason; // STRICT union
  // Cloudflare-specific; OpenAI SDK doesn't define this:
  stop_reason?: CfStopReason;
}

export interface CfChatCompletionMessage {
  role: CfChatRole;
  content: string | null;

  // OpenAI-compatible optional fields:
  refusal?: string | null; // used by some models
  tool_calls?: CfChatCompletionMessageToolCall[]; // modern tool calls
  function_call?: CfChatCompletionMessageFunctionCall | null; // legacy (rare)
  // Some OSS/reasoning variants may include this:
  reasoning_content?: string | null;
}

export interface CfCompletionUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

// --- Optional supporting types (compatible with OpenAI SDK shapes) ---
export interface CfChatCompletionLogprobs {
  content: Array<{
    token: string;
    logprob: number;
    bytes?: number[] | null;
    top_logprobs?: Array<{
      token: string;
      logprob: number;
      bytes?: number[] | null;
    }>;
  }>;
}

// ---------- Streaming (SSE) chunk ----------
// Matches OpenAI `chat.completion.chunk` objects.

export interface CfChatCompletionChunk {
  id: string;
  object: "chat.completion.chunk";
  created: number; // unix seconds
  model: string; // e.g. "@cf/openai/gpt-oss-20b"
  choices: CfChatCompletionChunkChoice[];
  // OpenAI sometimes includes these; keep optional to remain compatible.
  system_fingerprint?: string;
  // Room for vendor/compat fields:
  [k: string]: unknown;
}

export interface CfChatCompletionChunkChoice {
  index: number;

  /**
   * The partial update to the message.
   * Tokens arrive in `delta.content`. The first chunk may include `delta.role`.
   * Tool/function call arguments stream via `delta.tool_calls`.
   */
  delta: CfChatCompletionChunkDelta;

  // Present on the terminal chunk for this choice.
  finish_reason?: CfChatCompletionFinishReason;

  // When requested, OpenAI can include token logprobs in streaming:
  logprobs?: CfChatCompletionLogprobs | null;
}

export interface CfChatCompletionChunkDelta {
  role?: CfChatRole;
  content?: string | null;

  // Modern tool calls (OpenAI style)
  tool_calls?: CfChatCompletionMessageToolCall[];

  // Legacy function_call (older models/SDKs)
  function_call?: {
    name?: string;
    arguments?: string; // streamed incrementally
  } | null;
}

async function* iterateSSE(
  response: Response,
): AsyncGenerator<
  { event?: string; data: string; id?: string },
  void,
  unknown
> {
  if (!response.body) throw new Error("No response body to read (SSE).");

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // Split on blank line (SSE event delimiter)
    let start = 0;
    while (true) {
      const sep = buffer.indexOf("\n\n", start);
      if (sep === -1) {
        // keep the tail for the next chunk
        buffer = buffer.slice(start);
        break;
      }
      const block = buffer.slice(start, sep);
      start = sep + 2;

      const event = parseSSEBlock(block);
      if (event) yield event;
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
      if (!raw || raw.startsWith(":")) continue; // comment/heartbeat
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
        // case "retry": // could be handled for reconnection backoff
        // default: ignore unknown fields
      }
    }

    if (dataLines.length === 0) return null;
    return { event, id, data: dataLines.join("\n") };
  }
}

function getLLMResponse(
  params: CfOpenAIChatCreateParamsStreaming,
): Promise<AsyncGenerator<CfChatCompletionChunk, void, unknown>>;
function getLLMResponse(
  params: CfOpenAIChatCreateParams,
): Promise<CfChatCompletion>;

async function getLLMResponse(
  params: CfOpenAIChatCreateParams | CfOpenAIChatCreateParamsStreaming,
) {
  const baseUrl = `https://gateway.ai.cloudflare.com/v1/${process.env.CLOUDFLARE_ACCOUNT_ID}/hopeflow/compat/chat/completions`; //`https://gateway.ai.cloudflare.com/v1/${process.env.CLOUDFLARE_ACCOUNT_ID}/hopeflow/workers-ai/v1/chat/completions`;
  const headersCommon = {
    Authorization: `Bearer ${process.env.CLOUDFLARE_HOPEFLOW_TOKEN ?? ""}`,
    "cf-aig-authorization": `Bearer ${
      process.env.CLOUDFLARE_HOPEFLOW_TOKEN ?? ""
    }`,
    "Content-Type": "application/json",
  };

  // STREAMING
  if ("stream" in params && params.stream === true) {
    const response = await fetch(baseUrl, {
      method: "POST",
      headers: { ...headersCommon, Accept: "text/event-stream" },
      body: JSON.stringify({ ...params, input: "" }),
    });

    if (!response.ok) {
      let bodyText: string;
      try {
        bodyText = await response.text();
      } catch {
        bodyText = response.statusText;
      }
      throw new Error(`HTTP ${response.status}: ${bodyText}`);
    }

    return (async function* () {
      for await (const { data } of iterateSSE(response)) {
        if (data === "[DONE]") break;
        // Cloudflare SSE data should be a JSON chunk compatible with CfChatCompletionChunk
        yield JSON.parse(data) as CfChatCompletionChunk;
      }
    })();
  }

  // NON-STREAMING
  const response = await fetch(baseUrl, {
    method: "POST",
    headers: { ...headersCommon, Accept: "application/json" },
    body: JSON.stringify({ ...params, input: "" }),
  });

  if (!response.ok) {
    let bodyText: string;
    try {
      bodyText = await response.text();
    } catch {
      bodyText = response.statusText;
    }
    throw new Error(`HTTP ${response.status}: ${bodyText}`);
  }

  const json: unknown = await response.json();

  if (!json || typeof json !== "object") {
    throw new Error("AI server response is invalid");
  }

  // Cloudflare errors commonly look like { error: { message, code? } }
  if ("error" in json) {
    const error = (json as { error: unknown }).error as
      | { message?: string; code?: unknown }
      | unknown;
    throw new Error(
      typeof error === "object" &&
      error &&
      "message" in error &&
      typeof (error as { message: string }).message === "string"
        ? (error as { message: string }).message
        : JSON.stringify({ error: error }),
    );
  }

  return json as CfChatCompletion;
}

// const getLLMResponse = async <
//   P extends CfOpenAIChatCreateParams | CfOpenAIChatCreateParamsStreaming,
// >(
//   params: P,
// ): Promise<
//   P extends CfOpenAIChatCreateParamsStreaming
//     ? AsyncGenerator<CfChatCompletionChunk, void, unknown>
//     : CfChatCompletion
// > => {
//   if (params.stream === true) {
//     const result = await fetch(
//       `https://gateway.ai.cloudflare.com/v1/${process.env.CLOUDFLARE_ACCOUNT_ID}/hopeflow/workers-ai/v1/chat/completions`,
//       {
//         headers: {
//           Authorization: `Bearer ${process.env.CLOUDFLARE_HOPEFLOW_TOKEN}`,
//           "Content-Type": "application/json",
//           Accept: "application/json",
//         },
//         body: JSON.stringify({ ...params, input: "" }),
//         method: "POST",
//       },
//     );
//     if (!result.ok) {
//       let errText: string;
//       try {
//         errText = await result.text();
//       } catch {
//         errText = result.statusText;
//       }
//       throw new Error(`HTTP ${result.status}: ${errText}`);
//     }
//     return (async function* () {
//       for await (const { data } of iterateSSE(result)) {
//         if (data === "[DONE]") break;
//         yield JSON.parse(data) as CfChatCompletionChunk;
//       }
//     })();
//   } else {
//     const result = await fetch(
//       `https://gateway.ai.cloudflare.com/v1/${process.env.CLOUDFLARE_ACCOUNT_ID}/hopeflow/workers-ai/v1/chat/completions`,
//       {
//         headers: {
//           Authorization: `Bearer ${process.env.CLOUDFLARE_HOPEFLOW_TOKEN}`,
//           "Content-Type": "application/json",
//           Accept: "application/json",
//         },
//         body: JSON.stringify({ ...params, input: "" }),
//         method: "POST",
//       },
//     ).then((r) => r.json());
//     if (typeof result !== "object" || !result)
//       throw new Error("AI server response is invalid");
//     // TODO: Make it compatible with ZOD
//     if ("error" in result)
//       throw new Error(JSON.stringify({ error: result.error }));
//     return result as CfChatCompletion;
//   }
// };

export const transliterate = async (inputName: string) => {
  const prompt = `transliterate this name to ascii characters: ${inputName}. The output should be a json with following format: {"ascii": "name in ascii"}`;

  const output = await getLLMResponse({
    model: "workers-ai/@cf/openai/gpt-oss-20b",
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  const parsedOutput = JSON.parse(
    output.choices.filter((c) => c.message.content !== null).at(0)?.message
      .content as string,
  );
  return parsedOutput.ascii;
};

export const titleGenerationPrompt =
  'You are an expert on literature and psychology. The user will give you a passage and title. You have to generate one 4-7 word sentence to ask the reader of the sentence to help the writer of passage reach his/her goal. Try to include key points of the passage that may affect help. The input will be in JSON format. "name" field holding name of the writer of passage and "passage" indicating the content of the passage. The sentence should be in third person voice e.g. `Help Nolan recover his stolen totem` or `Aid Susan find her beloved cat (Maggy)` or `Stand with John in search for "Arabian Nights"';

export const reasonGenerationPrompt =
  'Given a reason to pass a request from a friend of you to someone you know or a group of people you know, convert it to a SMALL paragraph length text from the third person perspective addressing the reader. If no reason is provided, generate a general paragraph that is true implicitly and make it explicit. Do not add any unspecified claims. e.g. "Because he is in the neighborhood and knows cars well" to "Because you are in the neighborhood and know cars." or "Because she has a large connection pool with painters and artists" to "As you have vast connections with painters and art people". For empty reasons for example "Because he thinks you can help Mat find his stolen car".';

export const callForActionSentenceGenerationPrompt =
  'The user will give you a passage containing description of a request for help and title. Generate 4 4-7 word sentences and output a JSON array. First sentence checking with reader if he has the answer, lead and can directly help e.g. "If you know where to find it". Second checking with reader if he knows someone that MAY be able to help or even pass the word e.g. "If you know someone who may help". Third sentence encoraging to connect with the starter of quest and providing them with answer. And finally fourth to encourage passing the word via Reflow. Reflow is a term used in the application. The first two sentences must be INCOMPLETE and must NOT be questions.';
