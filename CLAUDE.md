# Taylor's Secret Garden

## Subagent models

Small, fully specified tasks go to Sonnet (`quick` agent); audits, searches and reviews to Fable (`scout`); medium implementation packages to Fable (`builder`); orchestration and anything security-sensitive stay on the main model. See `docs/agents/model-routing.md`.

## Agent skills

### Issue tracker

Issues and tickets live in GitHub Issues on `Eragon67360/taylorssecretgarden` (via `gh`). See `docs/agents/issue-tracker.md`.

### Triage labels

Default vocabulary: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `CONTEXT.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.
