// One-off: clears everything the physical testing left in the database, before the restaurant goes live with it.
//
//   npm run db:wipe-test                 shows what would be deleted (changes nothing)
//   npm run db:wipe-test -- --apply      deletes it, in one transaction
//
// Kept: the owner's account (OWNER_EMAIL below), the menu, photos, opening hours and legal details (settings), the
// table plan, upcoming closed days and the published app versions. Everything else goes: every other account (guests
// and test team logins), table bills with their items, payments and kitchen tickets, online orders, reservations,
// customer notes, the activity log, app feedback and crash reports, blocks, sign-in sessions and attempt counters.
import { neon } from "@neondatabase/serverless";

const OWNER_EMAIL = "yetenbiathiopischerestaurant@gmail.com";
// Accounts that are not test logins and stay as they are.
const ALSO_KEEP = ["ethiogermnay@gmail.com", "yadavaryan2073@gmail.com"];
const apply = process.argv.includes("--apply");

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is missing.");
  process.exit(1);
}
const sql = neon(process.env.DATABASE_URL);

const [owner] = await sql`select id, name, email, role from users where lower(email) = ${OWNER_EMAIL}`;
if (!owner || owner.role !== "owner") {
  console.error(`Stopped: no owner account with ${OWNER_EMAIL}. Nothing was changed.`);
  process.exit(1);
}
const kept = await sql`select id, email from users where lower(email) = any(${ALSO_KEEP})`;
const keepIds = [Number(owner.id), ...kept.map((user) => Number(user.id))];
console.log(`Keeping the owner: ${owner.name} <${owner.email}> (id ${owner.id})`);
for (const user of kept) console.log(`Keeping: ${user.email} (id ${user.id})`);
console.log("");

const count = async (query) => Number((await query)[0].n);
const plan = [
  ["Table bills (with items, payments, kitchen tickets)", sql`select count(*) n from table_checks`],
  ["Online orders", sql`select count(*) n from orders`],
  ["Reservations", sql`select count(*) n from reservations`],
  ["Customer notes", sql`select count(*) n from customer_notes`],
  ["Activity log entries", sql`select count(*) n from audit_log`],
  ["App feedback", sql`select count(*) n from app_feedback`],
  ["App crash reports", sql`select count(*) n from app_crashes`],
  ["Order blocks", sql`select count(*) n from order_blocks`],
  ["Past closed days", sql`select count(*) n from closures where date < current_date`],
  ["Attempt counters", sql`select count(*) n from rate_hits`],
  ["Other accounts (guests and test team logins)", sql`select count(*) n from users where id <> all(${keepIds})`],
  [
    "Sign-ins, reset and confirmation links of other accounts",
    sql`
    select (select count(*) from sessions where user_id <> all(${keepIds}))
         + (select count(*) from password_resets where user_id <> all(${keepIds}))
         + (select count(*) from email_verifications where user_id <> all(${keepIds})) as n`,
  ],
];
for (const [label, query] of plan) console.log(`${String(await count(query)).padStart(6)}  ${label}`);

const others = await sql`select name, email, role from users where id <> all(${keepIds}) order by role, email`;
if (others.length) {
  console.log("\nAccounts that would be deleted:");
  for (const user of others) console.log(`        ${user.role.padEnd(8)} ${user.email}  (${user.name})`);
}

if (!apply) {
  console.log("\nNothing changed. Run again with --apply to delete the above.");
  process.exit(0);
}

await sql.transaction([
  sql`delete from table_checks`, // items, payments and round keys go with them (on delete cascade)
  sql`delete from orders`,
  sql`delete from reservations`,
  sql`delete from customer_notes`,
  sql`delete from audit_log`,
  sql`delete from app_feedback`,
  sql`delete from app_crashes`,
  sql`delete from order_blocks`,
  sql`delete from closures where date < current_date`,
  sql`delete from rate_hits`,
  sql`delete from users where id <> all(${keepIds})`, // their sessions, reset and confirmation links go with them
]);
console.log("\nDone. Only the kept accounts and the site's content are left.");
