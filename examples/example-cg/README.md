# Example Community Group repo layout

A minimal working repo showing how to enable `respec-mcp` for a Community
Group report. Point the server at this directory:

```bash
npx -y respec-mcp --repo-root /path/to/respec-mcp/examples/example-cg
```

Then from an MCP client:

1. `respec_list_profiles` — should return one profile (`example-cg`).
2. `respec_scaffold` — writes `reports/source/index.html` from the `CG-DRAFT` template.
3. `respec_preflight` — checks the source against the profile.
4. `respec_validate` — full ReSpec render.
5. `respec_build` — writes `reports/build/index.html`.
