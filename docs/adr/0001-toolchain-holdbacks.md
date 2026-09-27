# Hold ESLint at 9 and TypeScript at 6

The 2026 refresh moves every dependency to its latest stable major, except two. ESLint stays on 9.x because `eslint-config-next` 16 pulls `eslint-plugin-react`, `jsx-a11y` and `import`, which cap at ESLint 9 (and `eslint-plugin-react` crashes on 10, vercel/next.js#91702). TypeScript stays on 6.0.x because TypeScript 7 is the Go-native compiler with no JavaScript API, which `next build` and `typescript-eslint` (<6.1) both depend on. Revisit when `eslint-config-next` supports ESLint 10 and `typescript-eslint` supports TypeScript 7.
