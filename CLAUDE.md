# Instructions for agents working in this repository

## Commit and push after every task

After completing any task in this repository (a fix, a feature, a docs update, etc.),
commit the changes and push to the current remote branch. Don't leave finished work
sitting uncommitted in the working tree.

- Stage only the files relevant to the task (avoid broad `git add -A` sweeps that pick up
  unrelated in-progress work from elsewhere in the tree — check `git status` first).
- If source under `src/` changed, rebuild the bundle (`npm run build-prod`, and the dev
  bundle via `npx webpack --config webpack/webpack.config.dev.js --no-watch` if
  `build/eurostatmap.js` is also tracked as changed) and include the updated `build/`
  output in the same commit.
- Push after committing — don't leave commits local-only.

## Never add a Co-Authored-By trailer

Do not add a `Co-Authored-By: Claude` (or any AI/assistant) trailer to commit messages
in this repository, regardless of what the default commit workflow template suggests.
