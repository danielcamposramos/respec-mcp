# Example Explainer layout

Minimal `respec-mcp` setup for a W3C-style explainer, following
[Explainer Explainer](https://www.w3.org/TR/explainer-explainer/).

```bash
npx -y respec-mcp --repo-root /path/to/respec-mcp/examples/example-explainer
```

The profile's `required_sections` enforce the structural skeleton the TAG
asks for (Discussion Venues, User-Facing Problem, Goals/Non-Goals, Proposed
Approach, Use Cases, Alternatives Considered, and the four horizontal
considerations). The profile's `forbidden_phrases` block spec-like status
claims (e.g. "W3C Recommendation") that an explainer must not make.

See [docs/AUTHORING_GUIDE.md §Explainers](../../docs/AUTHORING_GUIDE.md#explainers)
for authoring guidance this profile maps to.
