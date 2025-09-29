import { getCloudflareContext } from "@opennextjs/cloudflare";

export const titleGenerationPrompt =
  'You are an expert on literature and psychology. The user will give you a passage and title. You have to generate one 4-7 word sentence to ask the reader of the sentence to help the writer of passage reach his/her goal. Try to include key points of the passage that may affect help. The input will be in JSON format. "name" field holding name of the writer of passage and "passage" indicating the content of the passage. The sentence should be in third person voice e.g. `Help Nolan recover his stolen totem` or `Aid Susan find her beloved cat (Maggy)` or `Stand with John in search for "Arabian Nights"';

export const reasonGenerationPrompt =
  'Given a reason to pass a request from a friend of you to someone you know or a group of people you know, convert it to a SMALL paragraph length text from the third person perspective addressing the reader. If no reason is provided, generate a general paragraph that is true implicitly and make it explicit. Do not add any unspecified claims. e.g. "Because he is in the neighborhood and knows cars well" to "Because you are in the neighborhood and know cars." or "Because she has a large connection pool with painters and artists" to "As you have vast connections with painters and art people". For empty reasons for example "Because he thinks you can help Mat find his stolen car".';

export const callForActionSentenceGenerationPrompt =
  'The user will give you a passage containing description of a request for help and title. Generate 4 4-7 word sentences and output a JSON array. First sentence checking with reader if he has the answer, lead and can directly help e.g. "If you know where to find it". Second checking with reader if he knows someone that MAY be able to help or even pass the word e.g. "If you know someone who may help". Third sentence encoraging to connect with the starter of quest and providing them with answer. And finally fourth to encourage passing the word via Reflow. Reflow is a term used in the application. The first two sentences must be INCOMPLETE and must NOT be questions.';

//

const getLLMResponse = async (prompt: string) => {
  const result = await (
    await getCloudflareContext({ async: true })
  ).env.AI.run("@cf/openai/gpt-oss-20b", {
    input: prompt,
  });
  const output = (
    result as {
      output: Array<{ content: Array<{ text: string }>; type: string }>;
    }
  ).output
    .filter((i) => i.type === "message")
    .flatMap((i) => i.content.map((i) => i.text))
    .join("\n");
  return output;
};

export const transliterate = async (inputName: string) => {
  const prompt = `transliterate this name to ascii characters: ${inputName}. The output should be a json with following format: {"ascii": "name in ascii"}`;

  const output = await getLLMResponse(prompt);

  const parsedOutput = JSON.parse(output);
  return parsedOutput.ascii;
};
