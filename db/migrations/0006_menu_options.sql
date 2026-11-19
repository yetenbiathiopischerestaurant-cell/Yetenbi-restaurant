-- Options a guest can ask for with a dish ("auf Wunsch mit Sauce", "leicht angebraten", extra sauce …), edited in
-- /admin → Speisekarte. A list of { name: {de, en, am}, price } where price is the surcharge in euros (0 = no charge).
alter table menu_items add column if not exists options jsonb not null default '[]'::jsonb;
