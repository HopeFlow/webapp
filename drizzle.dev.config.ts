import "dotenv/config";
import { defineConfig } from "drizzle-kit";
import path from "node:path";
import fs from "node:fs";

// Oddly enough, you will get:
// Reading config file '.../HopeFlow/webapp/drizzle.dev.config.ts'
// require is not defined in ES module scope, you can use import instead
// error if you using following three lines to get current script path
// import { fileURLToPath } from "node:url";
// const __filename = fileURLToPath(import.meta.url);
// const __dirname = __filename.replace(/\/[^/]+$/, "");

const d1DatabaseObjectPath = path.join(
  __dirname,
  ".wrangler/state/v3/d1/miniflare-D1DatabaseObject",
);
const sqliteFilePath = fs
  .readdirSync(d1DatabaseObjectPath)
  .find((f) => f.endsWith(".sqlite"));

if (!sqliteFilePath) {
  throw new Error(
    `No SQLite file found in ${d1DatabaseObjectPath}. Please ensure the D1 database is set up correctly.`,
  );
}

export default defineConfig({
  out: "./drizzle",
  schema: "./src/db/schema.ts",
  dialect: "sqlite",
  dbCredentials: { url: path.join(d1DatabaseObjectPath, sqliteFilePath) },
});
