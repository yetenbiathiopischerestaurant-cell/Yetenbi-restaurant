import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";
import AccountShell from "@/components/account/AccountShell";
import { todayISO } from "@/lib/booking";
import { getPasswordHash, requireUser } from "@/lib/server/auth";
import { listForUser } from "@/lib/server/reservations";
import { listOrdersForUser } from "@/lib/server/orders";
import ProfileView from "./ProfileView";
import { getSiteSections } from "@/lib/server/site-sections";

export const metadata: Metadata = { title: "Mein Konto", robots: { index: false } };

/** Reads the session and the guest's bookings at request time. */
async function ProfileData() {
  await connection();
  const user = await requireUser();
  const [bookings, hash, orders, sections] = await Promise.all([
    listForUser(user.id),
    getPasswordHash(user.id),
    listOrdersForUser(user.id),
    getSiteSections(),
  ]);
  return (
    <ProfileView
      user={{
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        locale: user.locale,
        emailVerified: user.emailVerified,
      }}
      bookings={bookings.map((booking) => ({
        id: booking.id,
        reference: booking.reference,
        date: booking.date,
        time: booking.time,
        guests: booking.guests,
        status: booking.status,
      }))}
      today={todayISO()}
      canBook={sections.reservations}
      hasPassword={hash !== "none"}
      orders={orders.map((order) => ({
        reference: order.reference,
        status: order.status,
        total: order.total,
        createdAt: order.createdAt,
        method: order.method,
        url: `/bestellung?r=${order.reference}&t=${order.statusToken}`,
      }))}
    />
  );
}

export default function ProfilePage() {
  return (
    <AccountShell wide>
      <Suspense fallback={<div className="h-96" />}>
        <ProfileData />
      </Suspense>
    </AccountShell>
  );
}
