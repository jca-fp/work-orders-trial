import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { renderPage } from '../src/page.js';
import { MemoryStore } from '../src/store.js';
import type { Status, WorkOrder } from '../src/types.js';

const LABEL = '<span class="overdue">Overdue</span>';

function order(id: number, status: Status, dueDate: string, client = 'Harbor Cafe'): WorkOrder {
  return { id, title: `Order ${id}`, client, status, dueDate };
}

/** 2026-11-25 at 15:00 UTC is 10:00 on 2026-11-25 in New York. */
const NOW = new Date('2026-11-25T15:00:00Z');

let server: Server | undefined;

async function start(orders: WorkOrder[], now: Date = NOW): Promise<string> {
  server = createServer(createApp(new MemoryStore(orders), () => now));
  await new Promise<void>((resolve) => server!.listen(0, '127.0.0.1', resolve));
  return `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
}

afterEach(async () => {
  if (server) await new Promise((resolve) => server!.close(resolve));
  server = undefined;
});

async function page(base: string, query = ''): Promise<string> {
  const response = await fetch(`${base}/${query}`);
  expect(response.status).toBe(200);
  return response.text();
}

/** The HTML of the table row for an order. */
function rowOf(html: string, id: number): string {
  const match = new RegExp(`<tr data-status="[a-z_]+">\\s*<td>#${id}</td>[\\s\\S]*?</tr>`).exec(html);
  if (!match) throw new Error(`No row for #${id}`);
  return match[0];
}

function count(html: string, text: string): number {
  return html.split(text).length - 1;
}

describe('"Overdue" label on the list', () => {
  it('shows "Overdue" next to the due date of open and in-progress orders due before today', async () => {
    const html = await page(await start([order(1, 'open', '2026-11-24'), order(2, 'in_progress', '2026-10-01')]));
    expect(rowOf(html, 1)).toContain(`<td>Nov 24, 2026 ${LABEL}</td>`);
    expect(rowOf(html, 2)).toContain(`<td>Oct 1, 2026 ${LABEL}</td>`);
  });

  it('does not show it for an order due today or later', async () => {
    const html = await page(await start([order(1, 'open', '2026-11-25'), order(2, 'in_progress', '2026-11-26')]));
    expect(html).not.toContain(LABEL);
    expect(rowOf(html, 1)).toContain('<td>Nov 25, 2026</td>');
  });

  it('never shows it for a closed order, however old', async () => {
    const html = await page(await start([order(1, 'closed', '2020-01-01'), order(2, 'closed', '2026-11-24')]));
    expect(html).not.toContain(LABEL);
  });

  it('marks exactly the overdue orders in a mixed list', async () => {
    const html = await page(
      await start([
        order(1, 'open', '2026-11-20'),
        order(2, 'in_progress', '2026-11-24'),
        order(3, 'open', '2026-11-25'),
        order(4, 'closed', '2026-01-01'),
        order(5, 'open', '2026-12-01'),
      ]),
    );
    expect(count(html, LABEL)).toBe(2);
    expect(rowOf(html, 1)).toContain(LABEL);
    expect(rowOf(html, 2)).toContain(LABEL);
    for (const id of [3, 4, 5]) expect(rowOf(html, id)).not.toContain(LABEL);
  });

  it('shows the label in red', async () => {
    const html = await page(await start([order(1, 'open', '2026-11-24')]));
    expect(html).toMatch(/\.overdue \{[^}]*color: #c00;[^}]*\}/);
  });

  it('decides "today" in New York, whatever the machine time zone', async () => {
    const orders = [order(1, 'open', '2026-11-24')];
    // 03:00 UTC on Nov 25 is still Nov 24 in New York: due today, not overdue yet.
    expect(await page(await start(orders, new Date('2026-11-25T03:00:00Z')))).not.toContain(LABEL);
    await new Promise((resolve) => server!.close(resolve));
    // 05:00 UTC on Nov 25 is just after midnight in New York: now overdue.
    expect(await page(await start(orders, new Date('2026-11-25T05:00:00Z')))).toContain(LABEL);
  });

  it.each(['?status=open', '?client=harbor', '?status=open&client=HARBOR'])(
    'keeps the label with a status filter or a client search: %s',
    async (query) => {
      const html = await page(await start([order(1, 'open', '2026-11-24'), order(2, 'open', '2026-11-30')]), query);
      expect(rowOf(html, 1)).toContain(LABEL);
      expect(rowOf(html, 2)).not.toContain(LABEL);
    },
  );

  it('leaves the API list unchanged', async () => {
    const orders = [order(1, 'open', '2026-11-24'), order(2, 'closed', '2020-01-01')];
    const body = (await (await fetch(`${await start(orders)}/api/work-orders`)).json()) as WorkOrder[];
    expect(body).toEqual(orders);
  });
});

describe('renderPage with a given today', () => {
  it('marks orders due before the given date', () => {
    const html = renderPage([order(1, 'open', '2026-03-09'), order(2, 'open', '2026-03-10')], 'all', '', 2, '2026-03-10');
    expect(rowOf(html, 1)).toContain(`<td>Mar 9, 2026 ${LABEL}</td>`);
    expect(rowOf(html, 2)).not.toContain(LABEL);
  });
});
