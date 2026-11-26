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

1. Overdue orders come first, as a group. Inside that group the rules below apply: orders in
   progress before open ones, then the most overdue first.
2. Orders in progress come first, then open orders, then closed orders.
3. Inside each status, the earliest due date comes first.
4. Ties keep the lower order number first.

An open or in-progress order is overdue once its due date has passed in the business's time zone,
America/New_York. An order due today is not overdue yet; it becomes overdue at midnight New York
time. A closed order is never overdue.

Closed orders are always listed after open ones, however old their due date. A due date is a
calendar date with no time and no time zone. Only "today", used to decide what is overdue, is taken
in New York time, whatever the time zone of the machine.

## Filtering by status

The page has four choices above the list: All, In progress, Open and Closed, in the same order as
the list. All is the default.
The choice is kept in the address as `?status=in_progress`, `?status=open` or `?status=closed`, so
a filtered view can be shared as a link. `GET /api/work-orders` takes the same parameter.

- No `status`, or `status=all`, lists every order.
- Any other value, including an empty one or a different case such as `OPEN`, answers 400.
- A filtered list keeps the ordering rules above.

The page says how many orders are listed.

## Searching by client

The page has a search box above the status choices. It lists only the orders whose client name
contains the text you search for, ignoring upper and lower case: `maple`, `MAPLE` and `Bakery` all
find "Maple Bakery". The search is kept in the address as `?client=maple`, so a search can be shared
as a link. `GET /api/work-orders` takes the same parameter.

- No `client`, an empty one, or only spaces lists every order. Spaces around the text are ignored.
- A search that matches nothing lists no orders; it is not an error.
- The search works together with `?status=`, for example `?status=open&client=maple`. The status
  choices keep the current search, and searching keeps the chosen status.
- A searched list keeps the ordering rules above.

## Number of open orders

At the top of the page, under the title, a line says how many work orders are still open, for
example "2 open work orders". It counts every order that is open or in progress; closed orders are
not counted. It counts all orders, whatever status is chosen or client is searched, so the number
stays the same in every view. The "orders listed" line above the table still counts only the orders
in the current view. `GET /api/work-orders` is unchanged.

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
| `src/app.ts` | The routes: the page, `GET /api/work-orders` (with optional `?status=` and `?client=`), and closing an order |
| `src/page.ts` | The HTML of the page |
| `src/sort.ts` | The ordering rules, and what counts as overdue |
| `src/dates.ts` | Formatting of due dates, and today's date in New York |
| `src/notify.ts` | The stand-in for emailing a client |
| `src/store.ts` | Reading and writing orders, in Postgres or in memory |
| `db/init.sql` | The table and the sample orders |
| `test/` | The tests |
