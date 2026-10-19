# W3C document skills

These skills translate official document guidance into task-specific instructions for people and AI assistants. They cover the authoring and review workflows listed below, including work beyond specifications. They are maintained project guidance, not W3C-issued skills or a complete implementation of W3C process.

Start with [Shared editorial principles](EDITORIAL_PRINCIPLES.md), including the optional invitation to explain an idea in your own language. Each skill links the relevant official guide and identifies its tooling. Recheck time-sensitive process requirements before use.

| Document or task | Skill | Tooling |
| --- | --- | --- |
| Explainers | [w3c-explainer](../skills/w3c-explainer/SKILL.md) | ReSpec or Markdown, respec-check for ReSpec HTML |
| Technical reports and specifications | [w3c-technical-report](../skills/w3c-technical-report/SKILL.md) | ReSpec, Bikeshed, Nu HTML Checker, W3C Link Checker |
| Community Group reports | [w3c-cg-report](../skills/w3c-cg-report/SKILL.md) | ReSpec CG-DRAFT / CG-FINAL, respec-check, W3C CG report publication tools |
| Working and Interest Group charters | [w3c-charter](../skills/w3c-charter/SKILL.md) | W3C charter template, GitHub charter review, Chartering dashboard |
| Wide and horizontal review requests | [w3c-review-request](../skills/w3c-review-request/SKILL.md) | GitHub review templates, W3C horizontal issue tracker, Review dashboards |
| Security and privacy self-reviews | [w3c-security-privacy-review](../skills/w3c-security-privacy-review/SKILL.md) | W3C security/privacy questionnaire, TAG and horizontal review templates |
| Accessibility self-reviews | [w3c-accessibility-review](../skills/w3c-accessibility-review/SKILL.md) | FAST checklist, APA review request, WAI evaluation resources |
| Internationalization self-reviews | [w3c-i18n-review](../skills/w3c-i18n-review/SKILL.md) | W3C i18n short checklist, Internationalization review tracker |
| Implementation and interoperability reports | [w3c-implementation-report](../skills/w3c-implementation-report/SKILL.md) | web-platform-tests, wpt.fyi snapshots, Repository-specific test harnesses |
| Community Group transition proposals | [w3c-cg-transition](../skills/w3c-cg-transition/SKILL.md) | CG transition guidance, Charter drafts, Contribution-history tools |
| Publication and transition packages | [w3c-publication](../skills/w3c-publication/SKILL.md) | W3C transition selector, Pubrules / Specberus, Echidna, W3C Link Checker |
| Agendas and meeting minutes | [w3c-meeting-records](../skills/w3c-meeting-records/SKILL.md) | AgendaBot, Zakim, RRSAgent, scribe2 |
| Workshop calls, programs and reports | [w3c-workshop](../skills/w3c-workshop/SKILL.md) | W3C workshop guidance, HTML and accessibility checks |
| Presentations and public explainers | [w3c-presentation](../skills/w3c-presentation/SKILL.md) | W3C slide templates, Accessible-presentation guidance |

## Load only the relevant guidance

MCP clients can read `respec-mcp://skills` to discover the catalog, then `respec-mcp://skill/{skill_id}` to load one skill with the shared editorial principles. The existing `respec-mcp://authoring-guide` resource remains available for report authoring. Every skill is also a portable `skills/<name>/SKILL.md` file in this repository and the npm package.

## What is automated

`respec-check` and the MCP preflight/validate tools check the selected repository profile and, for full validation, render ReSpec HTML and collect diagnostics. The profiles can require headings and links, restrict document status and flag phrases. The skills themselves do not add validators for Bikeshed, Pubrules, Echidna, WPT, meeting minutes or translation quality.

For those workflows, the skill routes the assistant to the appropriate tool and asks it to report what was actually checked. Publishing, contacting a review group or recording a group decision continues to depend on the user’s authorization and the relevant process.
