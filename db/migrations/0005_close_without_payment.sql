-- The service app can free a table without taking payment ("Tisch schließen"): payment is taken outside the app
-- (open cash box / card terminal), so the app is not a till. Such a check is "closed": no payment rows, no tip,
-- no receipt link. Only widens the allowed statuses; existing rows are untouched.
alter table table_checks drop constraint if exists table_checks_status_check;
alter table table_checks add constraint table_checks_status_check check (status in ('open', 'paid', 'void', 'closed'));
