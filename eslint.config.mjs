import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";
import hopeflowPlugin from "./eslint-plugin-hopeflow/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({ baseDirectory: __dirname });

const eslintConfig = [
  {
    ignores: [
      "eslint-plugin-hopeflow/**",
      ".wrangler/**",
      "node_modules/**",
      ".next/**",
      ".open-next/**",
      ".tmpgen/**",
      "out/**",
      "build/**",
      "cloudflare-env.d.ts",
      "next-env.d.ts",
    ],
  },
  { ignores: ["src/3rdparty/**", "scripts/**"] },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    files: ["**/*.{ts,tsx}"],
    plugins: { hopeflow: hopeflowPlugin },
    rules: {
      "hopeflow/require-ensure-user-has-role": "error",
    },
  },
];

export default eslintConfig;
