import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Size and complexity budgets. Small single-purpose files are a hard rule here:
// split a file before it grows rather than raising a limit.
const lines = (max) => ["error", { max, skipBlankLines: true, skipComments: true }];

const budgets = {
  "max-lines": lines(200),
  "max-lines-per-function": lines(40),
  complexity: ["error", 10],
  "max-params": ["error", 3],
  "max-depth": ["error", 3],
};

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  { files: ["**/*.{ts,tsx,mjs}"], rules: budgets },
  // JSX is line-hungry; components get a little more room per function.
  { files: ["**/*.tsx"], rules: { "max-lines-per-function": lines(60) } },
  {
    files: ["**/*.test.ts", "e2e/**", "scripts/**"],
    rules: { "max-lines-per-function": "off" },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "src/generated/**",
    "public/engine/**",
    "relay/**",
  ]),
]);

export default eslintConfig;
