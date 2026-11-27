import { BUSINESS_TIME_ZONE, formatDueDate, todayIn } from './dates.js';
import { isOverdue } from './sort.js';
import type { Status, WorkOrder } from './types.js';

const STATUS_LABEL: Record<Status, string> = { open: 'Open', in_progress: 'In progress', closed: 'Closed' };

function escapeHtml(text: string): string {
  return text.replace(/[&<>"]/g, (char) => `&#${char.charCodeAt(0)};`);
}

/** `today` is a calendar date, YYYY-MM-DD, in the business's time zone. */
function row(order: WorkOrder, today: string): string {
  const action =
    order.status === 'closed'
      ? ''
      : `<form method="post" action="/work-orders/${order.id}/close"><button>Close</button></form>`;
  const overdue = isOverdue(order, today) ? ' <span class="overdue">Overdue</span>' : '';
  return `<tr data-status="${order.status}">
      <td>#${order.id}</td>
      <td>${escapeHtml(order.title)}</td>
      <td>${escapeHtml(order.client)}</td>
      <td>${STATUS_LABEL[order.status]}</td>
      <td>${formatDueDate(order.dueDate)}${overdue}</td>
      <td>${action}</td>
    </tr>`;
}

const CHOICES: [Status | 'all', string][] = [
  ['all', 'All'],
  ['in_progress', STATUS_LABEL.in_progress],
  ['open', STATUS_LABEL.open],
  ['closed', STATUS_LABEL.closed],
];

/** The address of the list for a status, keeping the client search when there is one. */
function listHref(status: Status | 'all', client: string): string {
  const params = new URLSearchParams();
  if (status !== 'all') params.set('status', status);
  if (client !== '') params.set('client', client);
  const query = params.toString();
  return query === '' ? '/' : `/?${query}`;
}

function filterControl(filter: Status | 'all', client: string): string {
  const links = CHOICES.map(
    ([choice, label]) =>
      `<a href="${escapeHtml(listHref(choice, client))}"${choice === filter ? ' aria-current="page"' : ''}>${label}</a>`,
  );
  return `<nav aria-label="Filter by status">${links.join(' | ')}</nav>`;
}

function searchControl(filter: Status | 'all', client: string): string {
  const status = filter === 'all' ? '' : `\n    <input type="hidden" name="status" value="${filter}">`;
  return `<form role="search" method="get" action="/">
    <label>Client <input type="search" name="client" value="${escapeHtml(client)}"></label>${status}
    <button>Search</button>
  </form>`;
}

/**
 * `openCount` is how many of all orders are open or in progress, whatever the filter and search.
 * When it is not given, it is counted from `orders`.
 * `today` is a calendar date, YYYY-MM-DD, in the business's time zone. It decides which orders are
 * marked "Overdue". When it is not given, it is today in New York.
 */
export function renderPage(
  orders: WorkOrder[],
  filter: Status | 'all' = 'all',
  client = '',
  openCount = orders.filter((order) => order.status !== 'closed').length,
  today = todayIn(BUSINESS_TIME_ZONE),
): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Work orders</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 2rem auto; max-width: 56rem; padding: 0 1rem; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border-bottom: 1px solid #ddd; padding: 0.5rem; text-align: left; }
    tr[data-status="closed"] { color: #888; }
    form[role="search"] { margin-bottom: 0.5rem; }
    nav a[aria-current="page"] { font-weight: bold; }
    .overdue { color: #c00; font-weight: bold; }
  </style>
</head>
<body>
  <h1>Work orders</h1>
  <p class="open-count">${openCount} open work ${openCount === 1 ? 'order' : 'orders'}</p>
  ${searchControl(filter, client)}
  ${filterControl(filter, client)}
  <p class="count">${orders.length} ${orders.length === 1 ? 'order' : 'orders'} listed</p>
  <table>
    <thead><tr><th>No.</th><th>Title</th><th>Client</th><th>Status</th><th>Due</th><th></th></tr></thead>
    <tbody>
    ${orders.map((order) => row(order, today)).join('\n    ')}
    </tbody>
  </table>
</body>
</html>`;
}
