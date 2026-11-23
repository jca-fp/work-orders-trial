CREATE TABLE work_orders (
  id       SERIAL PRIMARY KEY,
  title    TEXT NOT NULL,
  client   TEXT NOT NULL,
  status   TEXT NOT NULL CHECK (status IN ('open', 'in_progress', 'closed')),
  due_date DATE NOT NULL
);

INSERT INTO work_orders (title, client, status, due_date) VALUES
  ('Replace walk-in cooler gasket', 'Harbor Cafe',     'open',        CURRENT_DATE + 3),
  ('Quarterly hood cleaning',       'Blue Door Diner', 'in_progress', CURRENT_DATE + 1),
  ('Fix dish machine drain',        'Harbor Cafe',     'open',        CURRENT_DATE - 2),
  ('Calibrate ovens',               'Maple Bakery',    'in_progress', CURRENT_DATE - 5),
  ('Install new POS terminal',      'Blue Door Diner', 'closed',      CURRENT_DATE - 30),
  ('Repair patio heater',           'Maple Bakery',    'closed',      CURRENT_DATE - 10),
  ('Service ice machine',           'Harbor Cafe',     'open',        CURRENT_DATE);
