import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { MemoryStore } from '../src/store.js';
import type { WorkOrder } from '../src/types.js';

const ORDERS: WorkOrder[] = [
  { id: 1, title: 'Old closed job', client: 'Harbor Cafe', status: 'closed', dueDate: '2026-01-05' },
  { id: 2, title: 'Open job', client: 'Maple Bakery', status: 'open', dueDate: '2026-04-01' },
  { id: 3, title: 'Job in progress', client: 'Blue Door Diner', status: 'in_progress', dueDate: '2026-05-01' },
];

async function start(orders: WorkOrder[], now?: () => Date): Promise<{ server: Server; base: string }> {
  const server = createServer(createApp(new MemoryStore(orders), now));
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  return { server, base: `http://127.0.0.1:${(server.address() as AddressInfo).port}` };
}

let server: Server;
let base: string;

beforeEach(async () => {
  ({ server, base } = await start(ORDERS));
});

afterEach(async () => {
  await new Promise((resolve) => server.close(resolve));
});

async function ids(query: string): Promise<number[]> {
  const response = await fetch(`${base}/api/work-orders?${query}`);
  expect(response.status).toBe(200);
  return ((await response.json()) as WorkOrder[]).map((o) => o.id);
}

describe('GET /api/work-orders?client=', () => {
  it('returns only the orders whose client contains the search', async () => {
    expect(await ids('client=bakery')).toEqual([2]);
  });

  it('matches part of a name in several orders, keeping the order', async () => {
    expect(await ids('client=a')).toEqual([2, 1]);
  });

  it('returns an empty list when nothing matches', async () => {
    expect(await ids('client=acme')).toEqual([]);
  });

  it.each(['HARBOR', 'harbor', 'hArBoR', 'Harbor Cafe'])('ignores upper and lower case: "%s"', async (client) => {
    expect(await ids(`client=${encodeURIComponent(client)}`)).toEqual([1]);
  });

  it('returns every order for an empty or blank search', async () => {
    expect(await ids('client=')).toEqual([3, 2, 1]);
    expect(await ids('client=%20%20')).toEqual([3, 2, 1]);
  });

  it('ignores spaces around the search', async () => {
    expect(await ids('client=%20maple%20')).toEqual([2]);
  });

  it.each([
    ['a', 'open', [2]],
    ['a', 'closed', [1]],
    ['a', 'in_progress', []],
    ['harbor', 'open', []],
    ['DINER', 'in_progress', [3]],
    ['', 'open', [2]],
    ['a', 'all', [2, 1]],
  ])('combines ?client=%s with ?status=%s', async (client, status, expected) => {
    expect(await ids(`client=${client}&status=${status}`)).toEqual(expected);
  });

  it('still answers 400 for an unknown status with a search', async () => {
    const response = await fetch(`${base}/api/work-orders?client=a&status=done`);
    expect(response.status).toBe(400);
  });
});

describe('GET /?client=', () => {
  it('shows an empty search box without a search', async () => {
    const html = await (await fetch(`${base}/`)).text();
    expect(html).toContain('<form role="search" method="get" action="/">');
    expect(html).toContain('<input type="search" name="client" value="">');
    expect(html).not.toContain('type="hidden"');
  });

  it('lists only the matching orders and keeps the search in the box', async () => {
    const html = await (await fetch(`${base}/?client=maple`)).text();
    expect(html).toContain('Open job');
    expect(html).not.toContain('Old closed job');
    expect(html).not.toContain('Job in progress');
    expect(html).toContain('1 order listed');
    expect(html).toContain('<input type="search" name="client" value="maple">');
  });

  it('says when no order matches', async () => {
    const html = await (await fetch(`${base}/?client=zzz`)).text();
    expect(html).toContain('0 orders listed');
  });

  it('works with the status filter and keeps the search in the status links', async () => {
    const html = await (await fetch(`${base}/?client=a&status=open`)).text();
    expect(html).toContain('Open job');
    expect(html).not.toContain('Old closed job');
    expect(html).toContain('1 order listed');
    expect(html).toContain('<a href="/?status=open&#38;client=a" aria-current="page">Open</a>');
    expect(html).toContain('<a href="/?client=a">All</a>');
    expect(html).toContain('<a href="/?status=closed&#38;client=a">Closed</a>');
    expect(html).toContain('<input type="hidden" name="status" value="open">');
  });

  it('escapes the search text', async () => {
    const html = await (await fetch(`${base}/?client=${encodeURIComponent('"><b>x')}`)).text();
    expect(html).not.toContain('"><b>x');
    expect(html).toContain('value="&#34;&#62;&#60;b&#62;x"');
  });
});

describe('client search keeps the overdue-first order', () => {
  const NOW = new Date('2026-11-25T03:00:00Z');
  const DATED: WorkOrder[] = [
    { id: 11, title: 'Due tomorrow', client: 'Harbor Cafe', status: 'in_progress', dueDate: '2026-11-25' },
    { id: 12, title: 'Due today', client: 'Maple Bakery', status: 'open', dueDate: '2026-11-24' },
    { id: 13, title: 'Due yesterday', client: 'Blue Door Diner', status: 'open', dueDate: '2026-11-23' },
    { id: 14, title: 'Closed long ago', client: 'Harbor Cafe', status: 'closed', dueDate: '2026-01-01' },
  ];

  it('sorts the matching orders by the usual rules', async () => {
    const dated = await start(DATED, () => NOW);
    try {
      const all = (await (await fetch(`${dated.base}/api/work-orders?client=a`)).json()) as WorkOrder[];
      expect(all.map((o) => o.id)).toEqual([11, 12, 14]);
      const doors = (await (await fetch(`${dated.base}/api/work-orders?client=o`)).json()) as WorkOrder[];
      expect(doors.map((o) => o.id)).toEqual([13, 11, 14]);
    } finally {
      await new Promise((resolve) => dated.server.close(resolve));
    }
  });
});
