# Notes — Wire Claude into your stack

How Claude is wired into this repo, and why. Everything below is committed, so
anyone who clones the branch gets the same setup.

## 1. Server (MCP)

**What:** the official filesystem server (`@modelcontextprotocol/server-filesystem`),
connected at project scope in `.mcp.json` as `docs` and launched with `npx`,
pointed at `docs/`.

**Why it's useful here:** it gives Claude structured access to the API
reference in `docs/api.md`, so it can check the docs against the routes. It
needs no credentials, so there's nothing secret in `.mcp.json`. I picked a Node
server over the Python fetch server because everyone working on this repo
already has `npx`, but not necessarily `uvx`.

**Permission rule:** `permissions.allow` in `.claude/settings.json` allows only
three read-only tools: `mcp__docs__read_text_file`, `mcp__docs__list_directory`
and `mcp__docs__search_files`. The write tools (`write_file`, `edit_file`,
`move_file`, `create_directory`) still ask first. The rule matters more than
it looks: in testing, Claude Code passes the project root to the server as its
"roots", which overrides the `./docs` argument. So the server can actually
reach the whole project, and the permission rule is the real boundary.

## 2. Skill

**What:** `express-route` (`.claude/skills/express-route/SKILL.md`). It captures
how an endpoint is added or changed here, the most repeated job in this repo:
one router per resource, all data through `db/store.js`, `400`/`404`
validation, `{ "error": "message" }` errors, supertest tests, and an updated
`docs/api.md`. The body is six ordered steps (store → router → mount → tests →
docs → verify), so it also covers a brand-new resource.

**How the description fires:** it names this repo's conventions and the
phrases people actually type ("add DELETE /users/:id", "create a products
resource", "add validation to POST /users"). It also names what it is *not*
for: explaining endpoints, reading the docs, or calling the running API. A
first draft was too generic ("routes in an Express application") and excluded
"questions", which would have blocked "Can you add a products endpoint?". In a
fresh session, "Add a products resource with name and price" fired the skill
and "What does GET /users return?" did not.

## 3. Command

**What:** `/review-conventions [path]` (`.claude/commands/review-conventions.md`).
It reviews uncommitted changes against the `CLAUDE.md` conventions and reports
✅/❌/➖ per rule, with `file:line` evidence and a one-line fix for each
problem. An optional path narrows it to one file.

**Why it's worth a shortcut:** it's the check to run before every commit. The
skill *writes* code the project's way; the command *checks* it. A route
scaffold command would have duplicated the skill. It's read-only:
`allowed-tools` pre-approves only `git diff`, `git status`, `Read`, `Grep` and
`Glob`, and the prompt says "report only", because `allowed-tools`
pre-approves tools but doesn't block others. It uses
`git status --untracked-files=all`, because `git diff` alone misses new files.
To test it, I changed two `400`s to `404`s in `POST /products`. It flagged
them, and after I reverted the change, every rule passed again.

## 4. Hook

**What:** a `PostToolUse` hook on `Edit|Write` in `.claude/settings.json`. It runs
`.claude/hooks/lint-edited-file.js`, which lints the edited `.js` file with
ESLint and `--max-warnings 0`. If lint fails, it exits `2`, and the ESLint
output is sent back to Claude to fix.

**React or prevent:** it **reacts**. I chose `PostToolUse` over `PreToolUse` for
two reasons. Before an edit, the file on disk is still the old version, so a
pre-edit lint would check the wrong code. And code is often briefly lint-dirty
between edits, such as declaring a variable in one edit and using it in the
next, which a pre-edit gate would block. CI runs the same `npm run lint`, so
the hook catches problems at edit time instead of at PR time.

**Seen firing:** I asked Claude to add an unused
`const myOrder = { productName: "Book", price: 25 };` to `POST /products`. The
hook returned
`'myOrder' is assigned a value but never used  no-unused-vars` and blocked. The
same line added by hand in the IDE didn't trigger it, because the hook only
runs on Claude's own edits.

## 5. Headless run

**What:** a read-only check that `docs/api.md` matches the code in `routes/`:

```powershell
claude -p $prompt --allowedTools "mcp__docs__read_text_file" "Read" "Grep" "Glob" --max-turns 15 --output-format json
```

`$prompt` asks Claude to compare each endpoint's method, path, body, status
codes and error messages, "report only", and output a table of mismatches with
`file:line`. It's the kind of check worth running unattended, such as before a
release, because the docs drift every time a route changes.

**What I locked down:** only the four tools needed to read the docs and the
code. `Edit`, `Write`, `Bash` and the MCP write tools aren't allowed. In
headless mode nobody is there to approve a prompt, so anything not allowed is
denied. `--max-turns 15` caps the run.

**Result:** the run took 9 turns and found no mismatches, with
`permission_denials` empty. To prove the lock, I ran it again with the same
tools but asked it to *fix* the docs. Claude tried one `Edit` on
`docs/api.md`, which was denied. It reported the fix as a diff instead, and
`git diff --stat` showed the file unchanged.
