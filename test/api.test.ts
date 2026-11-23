import { mkdtempSync, existsSync, readFileSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { notifyClient } from '../src/notify.js';
import { MemoryStore } from '../src/store.js';
import type { WorkOrder } from '../src/types.js';

const ORDERS: WorkOrder[] = [
  { id: 1, title: 'Old closed job', client: 'Harbor Cafe', status: 'closed', dueDate: '2026-01-05' },
  { id: 2, title: 'Open job', client: 'Maple Bakery', status: 'open', dueDate: '2026-04-01' },
  { id: 3, title: 'Job in progress', client: 'Blue Door Diner', status: 'in_progress', dueDate: '2026-05-01' },
];

let server: Server;
let base: string;

beforeEach(async () => {
  server = createServer(createApp(new MemoryStore(ORDERS)));
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterEach(async () => {
  delete process.env.SEND_EMAIL;
  await new Promise((resolve) => server.close(resolve));
});

describe('GET /api/work-orders', () => {
  it('returns every order, sorted', async () => {
    const response = await fetch(`${base}/api/work-orders`);
    expect(response.status).toBe(200);
    const body = (await response.json()) as WorkOrder[];
    expect(body.map((o) => o.id)).toEqual([3, 2, 1]);
  });
});

describe('GET /', () => {
  it('shows the orders on the page', async () => {
    const html = await (await fetch(`${base}/`)).text();
    expect(html).toContain('Open job');
    expect(html).toContain('Apr 1, 2026');
  });
});

describe('GET /api/work-orders?status=', () => {
  it.each([
    ['open', [2]],
    ['in_progress', [3]],
    ['closed', [1]],
    ['all', [3, 2, 1]],
  ])('?status=%s returns only those orders, sorted', async (status, ids) => {
    const response = await fetch(`${base}/api/work-orders?status=${status}`);
    expect(response.status).toBe(200);
    const body = (await response.json()) as WorkOrder[];
    expect(body.map((o) => o.id)).toEqual(ids);
    if (status !== 'all') expect(body.every((o) => o.status === status)).toBe(true);
  });

  it.each(['done', '', 'OPEN'])('answers 400 for the unknown status "%s"', async (status) => {
    const response = await fetch(`${base}/api/work-orders?status=${status}`);
    expect(response.status).toBe(400);
  });
});

describe('GET / with a status filter', () => {
  it('shows the four choices, with All selected, and the count', async () => {
    const html = await (await fetch(`${base}/`)).text();
    expect(html).toContain('<a href="/" aria-current="page">All</a>');
    expect(html).toContain('<a href="/?status=open">Open</a>');
    expect(html).toContain('<a href="/?status=in_progress">In progress</a>');
    expect(html).toContain('<a href="/?status=closed">Closed</a>');
    expect(html).toContain('3 orders listed');
  });

  it('lists only the chosen status and marks the choice', async () => {
    const html = await (await fetch(`${base}/?status=open`)).text();
    expect(html).toContain('Open job');
    expect(html).not.toContain('Old closed job');
    expect(html).not.toContain('Job in progress');
    expect(html).toContain('1 order listed');
    expect(html).toContain('<a href="/?status=open" aria-current="page">Open</a>');
    expect(html).toContain('<a href="/">All</a>');
  });

  it('answers 400 for an unknown status', async () => {
    const response = await fetch(`${base}/?status=bogus`);
    expect(response.status).toBe(400);
  });
});

describe('POST /work-orders/:id/close', () => {
  it('closes the order and goes back to the list', async () => {
    const response = await fetch(`${base}/work-orders/2/close`, { method: 'POST', redirect: 'manual' });
    expect(response.status).toBe(303);
    const body = (await (await fetch(`${base}/api/work-orders`)).json()) as WorkOrder[];
    expect(body.find((o) => o.id === 2)?.status).toBe('closed');
  });

  it('answers 404 for an order that does not exist', async () => {
    const response = await fetch(`${base}/work-orders/99/close`, { method: 'POST' });
    expect(response.status).toBe(404);
  });
});

describe('notifyClient', () => {
  const order = ORDERS[1]!;

  it('writes nothing unless SEND_EMAIL is "true"', () => {
    const file = join(mkdtempSync(join(tmpdir(), 'outbox-')), 'outbox.log');
    expect(notifyClient(order, file)).toBe(false);
    process.env.SEND_EMAIL = 'false';
    expect(notifyClient(order, file)).toBe(false);
    expect(existsSync(file)).toBe(false);
  });

  it('writes one line when SEND_EMAIL is "true"', () => {
    const file = join(mkdtempSync(join(tmpdir(), 'outbox-')), 'outbox.log');
    process.env.SEND_EMAIL = 'true';
    expect(notifyClient(order, file)).toBe(true);
    expect(readFileSync(file, 'utf8')).toContain('EMAIL to Maple Bakery: work order #2');
  });
});
