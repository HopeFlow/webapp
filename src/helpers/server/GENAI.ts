"use server";

import { GoogleGenAI } from "@google/genai";
import { defineServerFunction } from "./define_server_function";

// const defineServerFunction = (params: object) => {
//   return async () => {};
// };

export const getGenAIResponse = defineServerFunction({
  id: "getGenAIResponse",
  scope: "genai",
  handler: async (prompt: string) => {
    const ai = new GoogleGenAI({});
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image-preview",
      contents: prompt,
    });
    if (
      !response.candidates ||
      response.candidates.length === 0 ||
      !response.candidates[0].content ||
      !response.candidates[0].content.parts
    )
      return;
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return part.inlineData.data;
      }
    }
  },
});
