"use server";

import { z } from "zod";
import { Buffer } from "node:buffer";
import { defineServerFunction } from "./define_server_function";
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod.mjs";

if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not set");
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const workersAiModel = "@cf/leonardo/lucid-origin";
const workersAiUrl = (accountId: string) =>
  `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${workersAiModel}`;

// async function generateByGptImage1(prompt: string) {
//   const response = await openai.images.generate({
//     model: "gpt-image-1-mini", // or "dall-e-3"
//     prompt,
//     output_format: "jpeg",
//     quality: "low",
//     size: "1024x1024",
//   });
//   const base64Image = response.data?.find((d) => d.b64_json)?.b64_json;
//   return base64Image;
// }

export async function generateByWorkersAi(prompt: string) {
  if (!process.env.CLOUDFLARE_ACCOUNT_ID)
    throw new Error("CLOUDFLARE_ACCOUNT_ID is not set");
  if (!process.env.CLOUDFLARE_API_TOKEN)
    throw new Error("CLOUDFLARE_API_TOKEN is not set");

  const response = await fetch(
    workersAiUrl(process.env.CLOUDFLARE_ACCOUNT_ID),
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
        "Content-Type": "application/json",
        Accept: "image/jpeg",
      },
      body: JSON.stringify({ prompt, width: 512, height: 512 }),
    },
  );

  if (!response.ok) {
    const errorText = await response.text().then(
      (t) => t,
      () => "<no body>",
    );
    throw new Error(
      `Workers AI request failed (${response.status}): ${errorText}`,
    );
  }

  if (!response.body)
    throw new Error("Workers AI response did not include a body");

  const base64Image = Buffer.from(await response.bytes()).toString("base64");
  return base64Image;
}

const promptJsonSchema = z.object({ prompt: z.string() });
export const generateCoverPhoto = defineServerFunction({
  id: "generateCoverPhoto",
  scope: "genai",
  handler: async (description: string) => {
    // console.log("start", new Date().toTimeString());
    const { output_parsed } = await openai.responses.parse({
      model: "gpt-5-nano",
      reasoning: { effort: "minimal" },
      input: [
        {
          role: "developer",
          content:
            "Your are an expert designer and idea generator. User will give you a description for a quest of his." +
            'Generate a prompt for "gpt-image-1-mini" to generate a cover photo for the given quest',
        },
        { role: "user", content: description },
      ],
      text: { format: zodTextFormat(promptJsonSchema, "promptJson") },
    });
    if (!output_parsed)
      throw new Error("Failed to generate prompt from description");
    // const base64Image = await generateByGptImage1(output_parsed.prompt);
    // console.log("generate", new Date().toTimeString());
    const base64Image = await generateByWorkersAi(output_parsed.prompt);
    // console.log("done", new Date().toTimeString());
    // console.log({ base64Image });
    return base64Image;
  },
});
