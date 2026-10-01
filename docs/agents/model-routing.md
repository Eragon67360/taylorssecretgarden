# Model routing

Choose the model per subagent when spawning it: one of the user-level agents in `~/.claude/agents/`, or the Agent tool's `model` parameter. This applies to the crew of parallel agents used for audits and work packages ("The Swifties"). Forks always run on the parent's model, whatever is asked.

| Work                                                                                                                                                                      | Model                           | How                                                |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- | -------------------------------------------------- |
| Orchestration, architecture, security-sensitive changes (auth, access control, data model and migrations, secrets, production settings), the final review of every branch | the main session's model (Opus) | yourself, or an agent without a model override     |
| Small, fully specified tasks: a one-file fix, a test fix, a rebase with known conflicts, a doc update, a lookup, a mechanical refactor                                    | Sonnet                          | `quick` agent, or `model: "sonnet"`                |
| Read-only work: an audit of one dimension, a codebase search, a second-opinion review of a branch                                                                         | Fable                           | `scout` agent (no edit tools), or `model: "fable"` |
| Medium implementation packages with a clear brief, alongside other implementers                                                                                           | Fable                           | `builder` agent                                    |

- When unsure whether a task is small, it isn't: give it to Fable or keep it on the main model.
- Never route security-sensitive packages to Sonnet.
- Review every report the same way, whatever model wrote it.
- Fable has its own weekly allowance in `/usage`: routing audits, reviews and medium packages to it spares the main allowance for the work that needs it.
- On a machine without the user-level agents, use `general-purpose` with the `model` parameter.
