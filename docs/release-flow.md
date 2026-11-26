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
- ensure target tag does not already exist (`git tag --list "X.Y.Z"`)
- ensure no `v`-prefixed tag exists for the same version (`git tag --list "vX.Y.Z"` should be empty)

2. Version bump

- update root version without auto-tagging:
    - `npm version X.Y.Z --no-git-tag-version`
- keep `build/package.json` version aligned to `X.Y.Z`

3. Build distributables

- install the locked toolchain first if `node_modules` is missing or stale: `npm ci` (see "Toolchain and lockfile" below; never a bare `npm install`)
- build everything:
    - `npm run build` (empties `build/`, then builds the typings, `eurostatmap.min.js` (`main`/`unpkg`),
      `eurostatmap.mjs` (`module`) and `eurostatmap.js` (dev)). `npm publish` runs it again by itself (`prepack`), so
      what is published always matches the source; it needs a current `npm ci`.
- verify build artifacts (e.g. `grep` for a distinctive new identifier in the three bundles)

4. Commit + tag + push

- stage all release changes (`build/` is not committed, except `build/package.json` with the new version)
- commit with message:
    - `Release X.Y.Z`
- create tag:
    - `X.Y.Z`
- push branch and tag:
    - `git push origin master`
    - `git push origin X.Y.Z`

5. Publish to npm (the user does this)

- **an agent never runs `npm publish`**: it only works with the user's security key
- report that the tagged commit is built, pushed and ready, state the version, and ask the user to run `npm publish` from the repo root
- wait until the user says it is published, then verify:
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

- only after step 5 has verified the published version; the user's publish is the go-ahead, no further ask needed
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

## Toolchain and lockfile

`package-lock.json` is committed so that the bundles are reproducible (they are built from the tag, not committed). Without it every fresh
`npm install` re-resolved the `^` ranges, and a rebuild with no source change rewrote thousands of
lines of third-party code in `build/eurostatmap.js` (and changed the minified bundle).

What the lock holds (chosen on 2026-11-16 because it rebuilds the 4.14.1 tag byte for byte:
`build/eurostatmap.min.js` and its `.map` identical, third-party modules of `build/eurostatmap.js`
identical):

- `webpack` 5.106.2 (5.107+ no longer emits the `Object.defineProperty(... "name" ...)` lines for
  anonymous default exports, 5.106.0 emits them with `Reflect.`; 5.106.1 and 5.106.2 match the bundle).
- `proj4` 2.19.10 with `wkt-parser` 1.5.2 (later proj4 adds `authlat.js`/`authset.js`, later wkt-parser
  renames the `PROJJSONBuilder*` files).
- `d3-format` 3.1.0, `simple-statistics` 7.8.8, `idb-keyval` 6.2.2, `jsonstat-toolkit` 1.3.1, i.e. the
  lowest versions allowed by `package.json` (the Nov 2026 d3 patch releases change the d3 source).
- `schema-utils` 4.7.0 (4.8.0 to 4.8.2 demand `webpack` ^5.112), `playwright` 1.64.1 (the version whose
  browser is installed on the maintainer's machine).
- everything else: newest versions published before 2026-11-02, with `d3-svg-annotation` installed
  after the other dependencies (so npm hoists d3-zoom's d3-drag/d3-transition, not d3-svg-annotation's
  old ones, to the top level: that layout is part of the bundle).

Rules:

- Use `npm ci` to install. It never touches the lock and fails if `package.json` and the lock disagree.
- Bumping a dependency is a deliberate change: `npm install <pkg>@<version>` (updates the lock),
  rebuild, and commit `package-lock.json`. Say in the commit
  message which package moved and why.
- Check what a bump did to the bundle before committing the lock. Build both bundles from the previous release
  commit with the old lock, again with the new lock, and diff `build/eurostatmap.js`: apart from the bumped
  package's modules there must be no difference. Strip `\r` first (`git` converts line endings on Windows).
- To get a clean tree after editing `package.json`, use `npm install --package-lock-only` and then `npm ci`,
  never delete the lock to "start fresh" (that re-resolves everything to the newest versions).
- `overrides` in `package.json` (d3-color) apply to the lock as well; changing them needs the same care.

## Operational Notes

- Avoid interactive git workflows.
- Do not amend unrelated commits (only amend a release commit you just made yourself, and only if it hasn't been pushed yet).
- Never reset or discard user changes unless explicitly requested.
- If unexpected unrelated modifications appear mid-release, pause and ask the user how to proceed.
- Never add a `Co-Authored-By: Claude ...` trailer to any commit made as part of this flow (release commit, release-notes commit, or otherwise).
- The user may be working directly in this same local checkout concurrently (their own commits, their own `npm publish`, uncommitted debug scratch files/`console.log`s). Before assuming your own view of `master`/npm is current, re-check `git log`, `git status`, and `npm view eurostat-map versions --json` rather than trusting what you last knew — don't touch or revert files you didn't create that look like in-progress exploration (e.g. `*.tmp.js` scratch files, an uncommitted debug log statement).
