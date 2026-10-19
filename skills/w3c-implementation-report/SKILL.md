---
name: w3c-implementation-report
description: "Prepare implementation evidence and test-result reports for a proposed standard or transition."
---

# Implementation and interoperability reports

Tie each claim to the specification revision, test revision, implementation version and relevant environment. Separate passes, failures, unsupported features and untested cases. Preserve reproducible commands and result artifacts; do not infer implementation independence or interoperability from a count of passing checks.

For WPT-based evidence, use a stable wpt.fyi snapshot as described by W3C so subsequent runs do not silently change the cited results. Where tests are outside WPT, explain the harness and coverage limits. ReSpec may render the report; respec-mcp does not run product conformance tests or decide whether transition criteria have been met.

## Shared guidance and tools

Read [Shared editorial principles](../../docs/EDITORIAL_PRINCIPLES.md) for native-language collaboration and the boundaries of automated checks. Use only tools applicable to this document: web-platform-tests, wpt.fyi snapshots, Repository-specific test harnesses.

## Official sources

Reviewed 19 October 2026. Recheck the current guide before relying on process-specific requirements.

- [WPT snapshot documentation](https://www.w3.org/2021/04/wpt-fyi.html)
- [Web-platform-tests documentation](https://web-platform-tests.org/)
