import rootStates from "@/app/rootStates";
import { getHopeflowDatabase } from "@/db";
import { getCloudflareContext } from "@opennextjs/cloudflare";
// import Image from "next/image";

export default rootStates.index.defineRenderer(async function Home() {
  const db = await getHopeflowDatabase();
  const context = await getCloudflareContext({ async: true });
  const o = await context.env.hopeflow.get("hello.txt");
  const message = !o
    ? "No file, creating one :)"
    : `Found the file :) (${await o.text()})`;
  if (!o) {
    await context.env.hopeflow.put("hello.txt", "This is a test");
  }
  const c = JSON.stringify(await db.query.questTable.findMany());
  return (
    <div className="flex flex-col p-6 items-center justify-start">
      <h1 className="font-normal text-2xl">Hopeflow</h1>
      <p>Spread the ask, amplify the find</p>
      <p className="text-sm text-gray-500">{c}</p>
      <p className="text-sm text-gray-500">{message}</p>
    </div>
  );
});
