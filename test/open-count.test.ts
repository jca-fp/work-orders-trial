import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { MemoryStore } from '../src/store.js';
import type { WorkOrder } from '../src/types.js';

const ORDERS: WorkOrder[] = [
  { id: 1, title: 'Old closed job', client: 'Harbor Cafe', status: 'closed', dueDate: '2026-01-05' },
  { id: 2, title: 'Open job', client: 'Maple Bakery', status: 'open', dueDate: '2026-04-01' },
  { id: 3, title: 'Job in progress', client: 'Blue Door Diner', status: 'in_progress', dueDate: '2026-05-01' },
];

const NOW = new Date('2026-11-25T03:00:00Z');

let server: Server | undefined;

async function start(orders: WorkOrder[]): Promise<string> {
  server = createServer(createApp(new MemoryStore(orders), () => NOW));
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

describe('number of open work orders at the top of the list', () => {
  it('counts open and in-progress orders, not closed ones', async () => {
    const html = await page(await start(ORDERS));
    expect(html).toContain('<p class="open-count">2 open work orders</p>');
  });

  it('says "1 open work order" for one', async () => {
    const html = await page(await start([ORDERS[0]!, ORDERS[1]!]));
    expect(html).toContain('<p class="open-count">1 open work order</p>');
  });

  it('says "0 open work orders" when every order is closed', async () => {
    const html = await page(await start([ORDERS[0]!]));
    expect(html).toContain('<p class="open-count">0 open work orders</p>');
  });

  it('says "0 open work orders" when there are no orders', async () => {
    const html = await page(await start([]));
    expect(html).toContain('<p class="open-count">0 open work orders</p>');
  });

  it.each(['?status=closed', '?status=open', '?client=acme', '?status=in_progress&client=maple'])(
    'counts all orders whatever the filter or search: %s',
    async (query) => {
      const html = await page(await start(ORDERS), query);
      expect(html).toContain('<p class="open-count">2 open work orders</p>');
    },
  );

  it('comes before the search box, the status choices and the table', async () => {
    const html = await page(await start(ORDERS));
    const count = html.indexOf('class="open-count"');
    expect(count).toBeGreaterThan(html.indexOf('<h1>'));
    expect(count).toBeLessThan(html.indexOf('<form role="search"'));
    expect(count).toBeLessThan(html.indexOf('<nav'));
    expect(count).toBeLessThan(html.indexOf('<table>'));
  });

  it('goes down by one when an order is closed', async () => {
    const base = await start(ORDERS);
    expect(await page(base)).toContain('2 open work orders');
    const response = await fetch(`${base}/work-orders/2/close`, { method: 'POST', redirect: 'manual' });
    expect(response.status).toBe(303);
    expect(await page(base)).toContain('<p class="open-count">1 open work order</p>');
  });

  it('counts overdue orders but never closed ones, however old', async () => {
    const html = await page(
      await start([
        { id: 11, title: 'Overdue open', client: 'Harbor Cafe', status: 'open', dueDate: '2026-11-01' },
        { id: 12, title: 'Overdue in progress', client: 'Maple Bakery', status: 'in_progress', dueDate: '2026-10-01' },
        { id: 13, title: 'Closed long ago', client: 'Blue Door Diner', status: 'closed', dueDate: '2020-01-01' },
      ]),
    );
    expect(html).toContain('<p class="open-count">2 open work orders</p>');
  });

  it('leaves the API list unchanged', async () => {
    const body = (await (await fetch(`${await start(ORDERS)}/api/work-orders`)).json()) as WorkOrder[];
    expect(body.map((o) => o.id)).toEqual([3, 2, 1]);
  });
});
