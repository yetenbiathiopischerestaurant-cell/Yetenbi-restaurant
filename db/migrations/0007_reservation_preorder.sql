-- Dishes a guest chooses while booking a table (optional), so the kitchen can prepare and the wait is shorter.
-- A list of { id, name: {de, en, am}, qty, price, options: [{ name, price }] }, copied from the menu when booked.
alter table reservations add column if not exists preorder jsonb not null default '[]'::jsonb;
