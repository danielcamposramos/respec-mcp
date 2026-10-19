# Editorial checks in GitHub Actions

Reviewers see a check result, diagnostics, a job summary and a downloadable JSON report without installing Node or an MCP client. The result is relative to the repository's profile and its recorded SHA-256, not a certificate of W3C compliance. Humans review the text, evidence and policy changes.

## Add the check to a specification repository

The repository needs `respec-mcp.config.json`, a profile and ReSpec HTML source. Use the [examples](../examples/) to establish a profile appropriate to the document's real status.

```yaml
name: Editorial checks
on: [pull_request, push, workflow_dispatch]
permissions:
  contents: read
jobs:
  documents:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@fbc6f3992d24b796d5a048ff273f7fcc4a7b6c09 # v5
        with:
          persist-credentials: false
      - name: Check document
        id: editorial
        uses: danielcamposramos/respec-mcp@main # Pin the reviewed full commit SHA for ongoing use.
        with:
          profile: example-cg
          sources: |
            reports/source/index.html
      - name: Save check evidence
        if: always()
        uses: actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02 # v4
        with:
          name: editorial-checks
          path: ${{ steps.editorial.outputs.report }}
          include-hidden-files: true
          if-no-files-found: warn
```

The Action runs preflight and validation by default. `sources` accepts one exact path per line relative to `repo-root`, not shell expressions or globs. Omit it to check the profile's default source. Use a job matrix when documents need different profiles. Inputs also include `mode` (`both`, `preflight`, `validate`), `fail-on-warnings` and a per-document `timeout` in milliseconds.

The Action writes `.respec-check/report.json` inside `repo-root`, including on policy failure. Add `.respec-check/` to the consuming repository's ignore file. A report records the profile, actual document status, policy hashes and phase diagnostics. Missing files or a failed renderer produce a failed check, not a clean result. Preflight alone cannot verify dynamic configuration; unresolved checks fail that mode, while the default combined mode can resolve them during rendering.

## What reviewers should read

The workflow check opens the run and its job summary. Errors appear as annotations; warnings remain visible and can be made blocking. The JSON artifact preserves the full diagnostics. No PR comment permission or external account is required. A workflow badge reflects that workflow's branch result, not the compliance of every document or every past revision.

Repository maintainers can make the job a required status check through their branch rules. Installing this Action does not change branch protection or prevent merges by itself.

## Trust boundary

ReSpec documents execute JavaScript in a browser. Run review jobs on disposable GitHub-hosted runners with read-only repository permissions, no secrets and no persisted checkout credentials. Use `pull_request`; do not render untrusted PR content in a privileged `pull_request_target` job. The Action disables Chromium's sandbox for the disposable Linux runner, so it is not appropriate for a sensitive self-hosted machine.

Policy files are reviewed source too. A contributor can propose weaker rules in the same PR; inspect the policy diff and hashes rather than treating a green result as independent institutional approval. The Action provides evidence, not a tamper-proof authority over repository contributors.

The dependency installation uses this Action revision's lockfile, not a dependency script from the specification repository. Documents can still fetch external resources during rendering. Pin the Action revision and review upgrades.

References: [GitHub job summaries](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-commands#adding-a-job-summary), [GitHub guidance on privileged PR workflows](https://docs.github.com/en/actions/reference/security/securely-using-pull_request_target), [ReSpec documentation](https://respec.org/docs/).
