# Release Flow

This document defines the standard release process for eurostat-map so an agent can run it end-to-end consistently.

## Scope

Use this flow when you want to:

- build and publish a new npm version
- push a matching git tag
- prepare GitHub release notes from that tag
- keep an in-repo release history in `docs/release-notes.md`

This flow assumes:

- branch: `master`
- package: `eurostat-map`
- npm publish target: `latest`
- unpkg consumers use: `<script src="https://unpkg.com/eurostat-map"></script>`
- git tag format: `X.Y.Z` (no `v` prefix)

## Inputs Required

- Target version (example: `4.4.3`)
- Release type context (bugfix, feature, breaking change)

## Release Steps

1. Preflight checks

- confirm branch is `master`
- inspect working tree and include intended changes
- ensure npm auth is valid (`npm whoami`)
- ensure target tag does not already exist (`git tag --list "X.Y.Z"`)
- ensure no `v`-prefixed tag exists for the same version (`git tag --list "vX.Y.Z"` should be empty)

2. Version bump

- update root version without auto-tagging:
    - `npm version X.Y.Z --no-git-tag-version`
- keep `build/package.json` version aligned to `X.Y.Z`

3. Build distributables

- run production build:
    - `npm run build-prod`
- verify build artifacts were updated as expected

4. Commit + tag + push

- stage all release changes
- commit with message:
    - `Release X.Y.Z`
- create tag:
    - `X.Y.Z`
- push branch and tag:
    - `git push origin master`
    - `git push origin X.Y.Z`

5. Publish to npm

- publish from repo root:
    - `npm publish`
- if npm asks for browser auth, complete it and continue
- verify published version:
    - `npm view eurostat-map version`

6. Post-publish verification

- verify remote tag exists:
    - `git ls-remote --tags origin X.Y.Z`
- verify no accidental `v`-prefixed remote tag exists:
    - `git ls-remote --tags origin vX.Y.Z` should return nothing
- confirm working tree is clean:
    - `git status --short`
- note: unpkg may take a short time to refresh cache

7. Update release notes file

- append a new section for the released version in `docs/release-notes.md`
- use the release notes structure from this document
- include one code snippet for each meaningful change
- keep notes concise and copy-pasteable for GitHub Releases
- commit and push this documentation update if it was not already included

## Agent Output Requirements

After completing the flow, the agent should report:

- commit hash for release commit
- pushed tag name
- npm publish result/version
- any blockers encountered
- explicit confirmation that tag format used was `X.Y.Z` (no `v` prefix)

When preparing release notes for users:

- include a code snippet for each meaningful change listed in the notes
- snippets should be practical, copy-pasteable, and reflect the shipped API/behavior
- for type additions/changes, include a concise TypeScript interface/property snippet
- for map behavior changes, include a minimal builder-chain example
- for UI/example changes, include a focused JS/CSS snippet that demonstrates usage
- ensure the same notes are written to `docs/release-notes.md`
- document only library-facing changes from `src/**` by default
- exclude changes limited to `examples/**`, `docs/**`, or generated `build/**` artifacts from user release notes
- include non-`src/**` changes only when they reflect a real library/API/runtime behavior change that users of the package consume

## GitHub Release (No gh CLI)

When `gh` CLI is not available, do not attempt automated GitHub release creation.

Instead, the agent must provide this exact deliverable to the user:

- Give me a concise summary of meaningful changes made, as bullet points, in order to inform our users of new functionalities, improvements, and breaking changes. give it to me as markdown that i can simply copy and paste to my release notes when i create release from tag on github
- Include one code snippet per meaningful change in that markdown.

## Suggested Release Notes Structure

Use this markdown structure for release notes output:

- `## X.Y.Z`
- `### New`
- `### Improvements`
- `### Fixes`
- `### Breaking Changes` (only if applicable)
- `### Notes` (optional: unpkg cache propagation, migration hints)

Snippet conventions:

- after each meaningful bullet, add a short `Example` label and a fenced code block
- keep snippets short (roughly 5-20 lines) and focused on a single change
- prefer real API names and options exactly as released

## Operational Notes

- Avoid interactive git workflows.
- Do not amend unrelated commits.
- Never reset or discard user changes unless explicitly requested.
- If unexpected unrelated modifications appear mid-release, pause and ask the user how to proceed.
