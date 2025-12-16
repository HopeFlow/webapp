"use server";

import { z } from "zod";
import { Buffer } from "node:buffer";
import { defineServerFunction } from "./define_server_function";
import { GoogleGenAI, PersonGeneration } from "@google/genai";
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod.mjs";
import { currentUserNoThrow } from "./auth";

if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not set");
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
// const workersAiModel = "@cf/leonardo/lucid-origin";
// const workersAiUrl = (accountId: string) =>
//   `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${workersAiModel}`;

if (process.env.NODE_ENV === "production" && !process.env.GEMINI_API_KEY)
  throw new Error("GEMINI_API_KEY is not set");
const googleGenAI =
  process.env.NODE_ENV === "production" &&
  !!process.env.GEMINI_API_KEY &&
  new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function generateByGeminiPro(prompt: string) {
  if (!googleGenAI) throw new Error("googleGenAI not available");
  const response = await googleGenAI.models.generateImages({
    model: "models/imagen-4.0-generate-001",
    prompt,
    config: {
      numberOfImages: 1,
      imageSize: "1k",
      aspectRatio: "16:9",
      outputMimeType: "image/jpeg",
      personGeneration: PersonGeneration.ALLOW_ADULT,
    },
  });
  const generatedImage = response.generatedImages?.[0].image;
  const base64Image =
    generatedImage &&
    (generatedImage.imageBytes ??
      (generatedImage?.gcsUri &&
        (Buffer.from(
          await fetch(generatedImage.gcsUri).then((res) => res.bytes()),
        ).toString("base64") as string)));
  return base64Image;
}

async function generateByGptImage1(prompt: string) {
  const response = await openai.images.generate({
    model: "gpt-image-1-mini", // or "dall-e-3"
    prompt,
    output_format: "jpeg",
    quality: "low",
    size: "1024x1024",
  });
  const base64Image = response.data?.find((d) => d.b64_json)?.b64_json;
  return base64Image;
}

// export async function generateByWorkersAi(prompt: string) {
//   if (!process.env.CLOUDFLARE_ACCOUNT_ID)
//     throw new Error("CLOUDFLARE_ACCOUNT_ID is not set");
//   if (!process.env.CLOUDFLARE_API_TOKEN)
//     throw new Error("CLOUDFLARE_API_TOKEN is not set");

//   const response = await fetch(
//     workersAiUrl(process.env.CLOUDFLARE_ACCOUNT_ID),
//     {
//       method: "POST",
//       headers: {
//         Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
//         "Content-Type": "application/json",
//         Accept: "image/jpeg",
//       },
//       body: JSON.stringify({ prompt, width: 512, height: 512 }),
//     },
//   );

//   if (!response.ok) {
//     const errorText = await response.text().then(
//       (t) => t,
//       () => "<no body>",
//     );
//     throw new Error(
//       `Workers AI request failed (${response.status}): ${errorText}`,
//     );
//   }

//   if (!response.body)
//     throw new Error("Workers AI response did not include a body");

//   const base64Image = Buffer.from(await response.bytes()).toString("base64");
//   return base64Image;
// }

const promptGenerationPrompt = `
Create a Stable Diffusion prompt from user's description of his/her quest.
# Rules
- Do not copy description verbatim
- Detect named people and search the web for context
- Do not output the names
- Detect important elements
- Describe a minimalist visual graphical modern poster  in output
- The description MUST match important elements and named person profession
- Add SD details: composition, subtle textures. 
- Explicitly prohibit text 
- Output only the prompt, 1–3 sentences.
`.trim();

const promptJsonSchema = z.object({ prompt: z.string() });
export const generateCoverPhoto = defineServerFunction({
  uniqueKey: "genai::generateCoverPhoto",
  handler: async (description: string) => {
    // No need to check roles; any authenticated user can create a new quest
    // and so they can generate a cover photo
    const user = await currentUserNoThrow();
    if (!user) throw new Error("Not authenticated");
    const { output_parsed } = await openai.responses.parse({
      model: "gpt-4.1-mini",
      input: [
        { role: "developer", content: promptGenerationPrompt },
        { role: "user", content: description },
      ],
      text: { format: zodTextFormat(promptJsonSchema, "promptJson") },
    });
    if (!output_parsed)
      throw new Error("Failed to generate prompt from description");
    console.log({ coverPhotoPrompt: output_parsed.prompt });
    const base64Image =
      process.env.NODE_ENV === "development"
        ? await generateByGptImage1(output_parsed.prompt)
        : await generateByGeminiPro(output_parsed.prompt);

    return base64Image;
  },
});
