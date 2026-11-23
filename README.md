# Work orders

A small application that lists work orders for a maintenance business. Each order has a client, a
status (open, in progress or closed) and a due date. An order can be closed from the page.

It is a test application. It holds sample data only.

## What you need

- Node.js 22 or newer
- Docker, for the database

## Setup

```bash
npm ci
```

## Run

Start the database, then the application:

```bash
docker compose up -d db
npm run dev
```

Open http://localhost:3000. The database is created with seven sample orders the first time it
starts. To start again from the sample data, run `docker compose down -v` and start it again.

| Variable | Default | What it does |
| --- | --- | --- |
| `PORT` | `3000` | Port the application listens on |
| `DATABASE_URL` | `postgres://workorders:workorders@localhost:5432/workorders` | Where the database is |
| `SEND_EMAIL` | off | See "Closing an order" |

## Closing an order

Closing an order is meant to tell the client. This application never sends a real email. When
`SEND_EMAIL` is exactly `true`, it writes one line to `outbox.log`. With any other value, or none,
it writes nothing. Leave `SEND_EMAIL` off everywhere except a deliberate local test.

## How the list is ordered

1. Orders in progress come first, then open orders, then closed orders.
2. Inside each status, the earliest due date comes first.
3. Ties keep the lower order number first.

Closed orders are always listed after open ones, however old their due date. A due date is a
calendar date with no time and no time zone.

## Checks

```bash
npm run lint       # the linter
npm run typecheck  # the TypeScript compiler, without writing files
npm test           # the tests
npm run check      # all three
```

The tests do not need the database. They use an in-memory store.

On GitHub, the `check` workflow runs the linter, the type check and the tests on every pull request
to `main` and `staging`. It runs them twice, once with the time zone set to `UTC` and once with
`Asia/Tokyo`, so code that depends on the machine's time zone fails there. To do the same locally:

```bash
TZ=Asia/Tokyo npm test
```

## Contributing

1. Open an issue on GitHub that describes the change you want to make.
2. Create a branch from `main`.
3. Install and run the application as described in "Setup" and "Run".
4. Keep the change focused on that issue. When behaviour changes, add or update the tests in
   `test/`. When the change affects something this README describes, such as the ordering rules
   or `SEND_EMAIL`, update the README too.
5. Before you push, run the checks:

   ```bash
   npm run check
   ```

   If the change touches dates or times, also run `TZ=Asia/Tokyo npm test`.
6. Open a pull request to `main`. Say what changed and why, and link the issue. The `check`
   workflow must pass in both time zones. A person reviews and merges the pull request.

Never set `SEND_EMAIL` to `true` except for a deliberate local test. Do not commit `.env` or
`outbox.log`; both are listed in `.gitignore`.

## Layout

| Path | What it holds |
| --- | --- |
| `src/server.ts` | Starts the application with the Postgres store |
| `src/app.ts` | The routes: the page, `GET /api/work-orders`, and closing an order |
| `src/page.ts` | The HTML of the page |
| `src/sort.ts` | The ordering rules |
| `src/dates.ts` | Formatting of due dates |
| `src/notify.ts` | The stand-in for emailing a client |
| `src/store.ts` | Reading and writing orders, in Postgres or in memory |
| `db/init.sql` | The table and the sample orders |
| `test/` | The tests |
