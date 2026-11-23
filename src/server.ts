import { createServer } from 'node:http';
import { createApp } from './app.js';
import { PostgresStore } from './store.js';

const databaseUrl = process.env.DATABASE_URL ?? 'postgres://workorders:workorders@localhost:5432/workorders';
const port = Number(process.env.PORT ?? 3000);

createServer(createApp(new PostgresStore(databaseUrl))).listen(port, '0.0.0.0', () => {
  console.log(`Work orders listening on http://localhost:${port}`);
  console.log(`SEND_EMAIL is ${process.env.SEND_EMAIL === 'true' ? 'on' : 'off'}`);
});
