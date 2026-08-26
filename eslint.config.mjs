import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Static reference prototype, not app code.
    "public/references/templates/**",
  ]),
  {
    rules: {
      // No blank lines in source. Autofixed by the PostToolUse hook
      // (.claude/hooks/format-and-lint.sh) on every write.
      "no-multiple-empty-lines": ["error", { max: 0, maxEOF: 0, maxBOF: 0 }],
      "padded-blocks": ["error", "never"],
    },
  },
]);
export default eslintConfig;
