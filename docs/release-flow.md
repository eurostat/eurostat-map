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

## Before you start: batch, don't bump per fix

If you're iterating (building a feature, then fixing bugs the user spots in review, one after another) and **nothing has been published to npm yet**, do not bump the version and re-tag for every individual fix. Keep committing fixes normally, but only go through this flow's version-bump/tag step once, when the whole batch is believed ready. If you already tagged/pushed one or more intermediate versions before the batch was done, squash them back into a single commit under the original version number (`git reset --soft <commit before the first intermediate release>`, redo the version bump/build, commit once, move the tag) rather than stacking `X.Y.(Z+1)`, `X.Y.(Z+2)`, etc. — this does mean deleting/re-pushing already-pushed tags and force-pushing `master`, which is safe here specifically because nothing under those tags was ever `npm publish`ed. Confirm with the user before force-pushing regardless.

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
    - `npm run build-prod` (rebuilds `build/eurostatmap.min.js`, the `main`/`unpkg` target)
- **also rebuild the unminified dev bundle** if `src/**` changed:
    - `npm start` (runs `webpack --config webpack/webpack.config.dev.js`, a one-shot build despite the script name — not a watcher)
    - this regenerates `build/eurostatmap.js`, which is the package's `module` field target and is tracked in git separately from the min bundle. `build-prod` does **not** touch it — skipping this step ships a stale `build/eurostatmap.js` that silently lacks the release's changes for any consumer resolving via `module` (e.g. a bundler-based app like IMAGE).
- verify build artifacts were updated as expected (e.g. `grep` for a distinctive new identifier in both `build/eurostatmap.min.js` and `build/eurostatmap.js`)

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

- **stop and get explicit user permission before running `npm publish`**, even though every earlier step in this flow (version bump, build, commit, tag, push) can proceed without asking again. Do not fold the publish into the same autonomous batch of actions as the rest of the flow — report that the tagged commit is built/pushed and ready, state the version, and wait for an explicit go-ahead. This holds even if the user already approved the change itself and the version number; the publish step gets its own separate confirmation.
- once confirmed, publish from repo root:
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

8. Create GitHub Release

- check whether `gh` CLI is available and authenticated (`gh auth status`)
- if available, follow "GitHub Release (gh CLI available)" below
- if not available, follow "GitHub Release (No gh CLI)" below

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

## GitHub Release (gh CLI available)

When `gh` CLI is available and authenticated (`gh auth status` succeeds), create the GitHub Release directly rather than just handing the user markdown to paste:

- write the release notes for this version (same content added to `docs/release-notes.md`, without the leading `## X.Y.Z` heading) to a scratch file
- create the release from the pushed tag:
    - `gh release create X.Y.Z --title "X.Y.Z" --notes-file <scratch-file-path>`
- verify it was created against the right tag/commit:
    - `gh release view X.Y.Z --json tagName,targetCommitish,url`

## GitHub Release (No gh CLI)

When `gh` CLI is not available or not authenticated, do not attempt automated GitHub release creation.

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

Snippet conventions:

- after each meaningful bullet, add a short `Example` label and a fenced code block
- always include a language on fenced code blocks (use `javascript` for JS examples and `ts` for TypeScript snippets)
- keep snippets short (roughly 5-20 lines) and focused on a single change
- prefer real API names and options exactly as released

## Operational Notes

- Avoid interactive git workflows.
- Do not amend unrelated commits (only amend a release commit you just made yourself, and only if it hasn't been pushed yet).
- Never reset or discard user changes unless explicitly requested.
- If unexpected unrelated modifications appear mid-release, pause and ask the user how to proceed.
- Never add a `Co-Authored-By: Claude ...` trailer to any commit made as part of this flow (release commit, release-notes commit, or otherwise).
- The user may be working directly in this same local checkout concurrently (their own commits, their own `npm publish`, uncommitted debug scratch files/`console.log`s). Before assuming your own view of `master`/npm is current, re-check `git log`, `git status`, and `npm view eurostat-map versions --json` rather than trusting what you last knew — don't touch or revert files you didn't create that look like in-progress exploration (e.g. `*.tmp.js` scratch files, an uncommitted debug log statement).
