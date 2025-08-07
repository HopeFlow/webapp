import "dotenv/config";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./drizzle",
  schema: "./src/db/schema.ts",
  dialect: "sqlite",
  driver: "d1-http",
  dbCredentials: {
    accountId: "df21bd63604ae8dec9e43d7f29625da4",
    databaseId: "acd5cea8-b4fd-4fd4-8e00-12b3f6faae7b",
    token: process.env.HOPEFLOW_D1_TOKEN ?? ""
  },
});
