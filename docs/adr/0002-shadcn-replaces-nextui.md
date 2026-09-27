# shadcn/ui replaces NextUI

NextUI stopped at 2.6.11 (renamed HeroUI). Instead of migrating to HeroUI 2.8 (same API, still framer-motion, library-flavoured look) or HeroUI v3 (a React Aria rewrite), we copy shadcn/ui components into the repo on Tailwind 4. The site uses only a handful of primitives and is getting a bespoke per-Era design, so owning the component source beats restyling through a theme API. NextUI stays, untouched, only until the redesign lands; no interim HeroUI migration.
