// ESLint 9 flat config (ESLint 10 is held back, see docs/adr/0001-toolchain-holdbacks.md).
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier/flat";
import jsxA11y from "eslint-plugin-jsx-a11y";
import unusedImports from "eslint-plugin-unused-imports";

const config = [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "public/**",
      "portfolio-hover/**",
      "playwright-report/**",
      "test-results/**",
      "blob-report/**",
      "next-env.d.ts",
    ],
  },
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    name: "project/rules",
    plugins: {
      "unused-imports": unusedImports,
    },
    rules: {
      // Rules only: eslint-config-next already registers the jsx-a11y plugin,
      // and registering jsxA11y.flatConfigs.recommended throws "Cannot
      // redefine plugin".
      ...jsxA11y.flatConfigs.recommended.rules,

      "no-console": "warn",
      "react/jsx-uses-react": "off",
      "react-hooks/exhaustive-deps": "off",
      "jsx-a11y/click-events-have-key-events": "warn",
      "jsx-a11y/interactive-supports-focus": "warn",

      "unused-imports/no-unused-imports": "warn",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          args: "after-used",
          ignoreRestSiblings: false,
          argsIgnorePattern: "^_.*?$",
        },
      ],

      "import/order": [
        "warn",
        {
          groups: [
            "type",
            "builtin",
            "object",
            "external",
            "internal",
            "parent",
            "sibling",
            "index",
          ],
          "newlines-between": "always",
        },
      ],
      "react/self-closing-comp": "warn",
      "react/jsx-sort-props": [
        "warn",
        {
          callbacksLast: true,
          shorthandFirst: true,
          noSortAlphabetically: false,
          reservedFirst: true,
        },
      ],
      "padding-line-between-statements": [
        "warn",
        { blankLine: "always", prev: "*", next: "return" },
        { blankLine: "always", prev: ["const", "let", "var"], next: "*" },
        {
          blankLine: "any",
          prev: ["const", "let", "var"],
          next: ["const", "let", "var"],
        },
      ],
    },
  },
  {
    // TEMPORARY: the forum page is rewritten in #12 (Swiftter on Neon + Drizzle); these
    // errors are fixed there. Remove this block once that rewrite lands.
    name: "project/forum-pending-rewrite",
    files: ["app/forum/page.tsx"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/static-components": "off",
    },
  },
  // Must stay last: turns off stylistic rules that conflict with Prettier.
  prettier,
];

export default config;
