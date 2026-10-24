---
name: express-route
description: 'Adds or changes API endpoints in this Express repo following its conventions — router per resource in routes/, data only via db/store.js, 400/404 validation, { "error": "message" } errors, supertest tests, docs/api.md updated. Use when asked to add, create, or modify an endpoint, route, or new resource (e.g. "add DELETE /users/:id", "create a products resource", "add validation to POST /users"). Not for explaining existing endpoints, reading the API docs, or calling the running API.'
---

# Express route conventions

Follow these steps in order. Use `routes/users.js`, `db/store.js` and
`tests/users.test.js` as the reference implementation.

## 1. Store — `db/store.js`

Routes never hold state. All data access goes through helpers here.

- For a **new resource**, add its own array and id counter
  (e.g. `let products = []; let nextProductId = 1;`) and seed data inside
  `seed()`, so `reset()` re-seeds it too. Without this, tests leak data
  into each other.
- Add the helpers the routes need, named after the resource:
  `listX`, `getX(id)`, `createX(fields)`, `updateX(id, fields)`,
  `deleteX(id)`. Return `undefined` when the record doesn't exist.
- Add every new helper to `module.exports`.

## 2. Router — `routes/<resource>.js`

- One file per resource: `const router = express.Router();` …
  `module.exports = router;`
- One short comment above each handler in the existing style:
  `// GET /products/:id — fetch one product, or 404 if it doesn't exist.`
- Parse ids with `Number(req.params.id)`.
- Validate input before looking up the record:
  - Create (`POST`): every required field must be present and non-empty,
    otherwise `400`.
  - Update (`PUT`): at least one known field must be given, and any field
    that is given must be non-empty, otherwise `400`.
- Missing record → `404`.
- Status codes: `200` for reads and updates, `201` with the created record
  for create, `204` with no body for delete.
- Errors are always JSON: `res.status(4xx).json({ error: 'message' })`.
  Use messages like `'Product not found'` or `'name and price are required'`.
- Return early with `return res.status(...).json(...)`.

## 3. Mount — `server.js`

For a new resource, require the router and mount it under its base path
next to the others: `app.use('/products', productsRouter);`

## 4. Tests — `tests/<resource>.test.js`

- Use `node:test`, `node:assert` and `supertest`, importing `app` from
  `../server` and `store` from `../db/store`.
- Call `test.beforeEach(() => store.reset());`
- Cover, for each endpoint: the success case, `400` on bad input, and
  `404` on a missing id. Assert on `res.status` and on `res.body`
  (including `res.body.error` for error cases).

## 5. Docs — `docs/api.md`

Add or update the section for the resource: its shape as a JSON example,
then one `### METHOD /path` heading per endpoint describing the body, the
success status and the `400`/`404` cases.

## 6. Verify

Run `npm test` and `npm run lint`. Both must pass before the work is done.
