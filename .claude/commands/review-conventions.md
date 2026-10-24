---
description: Review uncommitted changes against this project's conventions (CLAUDE.md) and report pass/fail per rule
argument-hint: "[path]"
allowed-tools: Bash(git diff:*), Bash(git status:*), Read, Grep, Glob
---

Review the uncommitted changes in this repo against the project conventions below. Do not edit any files — report only.

## Changes

Status:
!`git status --short --untracked-files=all`

Diff of tracked files:
!`git diff`

`git diff` does not include untracked files. Read every file marked `??` above that is under `server.js`, `routes/`, `db/`, `tests/` or `docs/`.

## Scope

If a path is given here, review only that path: $ARGUMENTS
If it is empty, review all changed app files above. Ignore `.claude/`, `.mcp.json`, `node_modules/` and planning notes.

## Checklist

1. **One route file per resource** in `routes/`, exporting an `express.Router()`, and mounted in `server.js` under its base path.
2. **All data access goes through `db/store.js`** — routes hold no state. New store helpers are exported, and new resources are seeded inside `seed()` so
   `reset()` re-seeds them.
3. **Validation:** bad input returns `400` before any lookup; a missing record returns `404`.
4. **Status codes:** `200` for reads and updates, `201` with the record on create, `204` with no body on delete.
5. **Errors are JSON** in the shape `{ "error": "message" }`, returned early with `return res.status(...).json(...)`.
6. **Tests** in `tests/<resource>.test.js` use `node:test` + `supertest`, call `store.reset()` in `beforeEach`, and cover success, `400` and `404` for each
   endpoint.
7. **Docs:** `docs/api.md` has the resource's JSON shape and a `### METHOD /path` section for each endpoint.

## Output

1. A table with one row per checklist item: `#`, rule, ✅/❌/➖ (not applicable), and evidence as `file:line`.
2. Then a list of problems ordered by severity, each with `file:line` and a one-line fix.
3. If everything passes, say so in one line. No other commentary.
