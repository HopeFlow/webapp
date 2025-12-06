import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({ baseDirectory: __dirname });

const eslintConfig = [
  {
    ignores: [
      ".wrangler/**",
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "cloudflare-env.d.ts",
      "next-env.d.ts",
    ],
  },
  { ignores: ["src/3rdparty/**", "scripts/**"] },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
];

export default eslintConfig;
