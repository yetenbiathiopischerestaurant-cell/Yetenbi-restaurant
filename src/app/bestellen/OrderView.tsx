"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Moped, Storefront } from "@phosphor-icons/react";
import { useEffect, useMemo, useState } from "react";
import {
  formatEuro,
  totals,
  validateOrder,
  type Method,
  type OrderErrors,
  type OrderInput,
  type OrderSettings,
  type Payment,
} from "@/lib/ordering";
import { useLanguage } from "@/lib/language";
import { useAccount } from "@/lib/account-client";
import { fieldClass } from "@/components/account/AccountShell";
import { catalogOf, type Menu } from "@/lib/menu";
import type { DayHours } from "@/lib/hours";
import Basket from "./Basket";
import { Field } from "./FormParts";
import MenuPicker from "./MenuPicker";
import { useStoredCart } from "./useStoredCart";
import VerifyNotice from "@/components/account/VerifyNotice";

/** When delivery or pickup is possible today: open at all, "as soon as possible", and the later time slots. */
type TimeWindow = { open: boolean; asap: boolean; slots: string[] };

/** What /api/ordering returns. */
type Availability = {
  available: boolean;
  settings: OrderSettings;
  menu?: Menu;
  hours?: DayHours[];
  closedToday?: boolean;
  delivery?: TimeWindow;
  pickup?: TimeWindow;
};

type ContactForm = {
  name: string;
  phone: string;
  email: string;
  street: string;
  postcode: string;
  city: string;
  addressNote: string;
  note: string;
};

const emptyForm: ContactForm = {
  name: "",
  phone: "",
  email: "",
  street: "",
  postcode: "",
  city: "Würzburg",
  addressNote: "",
  note: "",
};

/** Keeps the chosen time if it is still offered, otherwise falls back to "asap" or the first slot. */
function validTime(chosen: string, window: TimeWindow) {
  if (chosen !== "asap" && window.slots.includes(chosen)) return chosen;
  if (window.asap) return "asap";
  return window.slots[0] ?? "asap";
}

/** Server error codes that have their own message. */
const SPECIAL_ERRORS = ["kitchen", "large", "blocked", "login", "verify"] as const;
type SpecialError = (typeof SPECIAL_ERRORS)[number];

export default function OrderView() {
  const { t, locale } = useLanguage();
  const text = t.order;
  const router = useRouter();
  const account = useAccount();
  const { cart, itemCount, quantityOf, setQuantity, keepOnly, clear } = useStoredCart();

  const [availability, setAvailability] = useState<Availability | null>(null);
  const [method, setMethod] = useState<Method>("delivery");
  const [payment, setPayment] = useState<Payment>("cash");
  const [wantedTime, setWantedTime] = useState("asap");
  const [form, setForm] = useState<ContactForm>(emptyForm);
  const [errors, setErrors] = useState<OrderErrors>({});
  const [serverError, setServerError] = useState<string>();
  const [sending, setSending] = useState(false);
  const [honeypot, setHoneypot] = useState(""); // a hidden field only bots fill in

  const settings = availability?.settings;
  const timeWindow = availability?.[method];
  const menu = useMemo(() => availability?.menu ?? [], [availability]);
  const catalog = useMemo(() => catalogOf(menu), [menu]);
  const prices = useMemo(
    () => (settings ? totals(cart, method, settings, catalog) : { subtotal: 0, deposit: 0, fee: 0, total: 0 }),
    [cart, method, settings, catalog],
  );
  const formatPrice = (amount: number) => formatEuro(amount, t.dateLocale);
  const errorText = (code?: keyof typeof text.errors) => (code ? text.errors[code] : undefined);

  // Load today's menu, settings and time windows.
  useEffect(() => {
    fetch("/api/ordering", { cache: "no-store" })
      .then((response) => response.json())
      .then((data: Availability) => {
        setAvailability(data);
        const pickupOnly = data.settings && !data.settings.delivery && data.settings.pickup;
        if (pickupOnly) setMethod("pickup");
      })
      .catch(() => setAvailability({ available: false, settings: {} as OrderSettings }));
  }, []);

  // Fill in name and phone from the account.
  useEffect(() => {
    if (!account) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setForm((current) => ({
      ...current,
      name: current.name || account.name,
      phone: current.phone || account.phone,
      email: current.email || account.email,
    }));
  }, [account]);

  // Once the menu has loaded, drop basket lines that can't be ordered any more.
  useEffect(() => {
    if (availability?.menu) keepOnly((id) => catalog.has(id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availability, catalog]);

  // Keep the chosen time valid when switching between delivery and pickup.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (timeWindow) setWantedTime((chosen) => validTime(chosen, timeWindow));
  }, [timeWindow]);

  function updateField(field: keyof ContactForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    setServerError(undefined);
  }

  const methodEnabled = method === "delivery" ? settings?.delivery : settings?.pickup;
  const canOrder = Boolean(
    availability?.available && settings && !settings.paused && timeWindow?.open && methodEnabled,
  );

  async function placeOrder(event: React.FormEvent) {
    event.preventDefault();
    if (!settings) return;

    const input: OrderInput = { method, items: cart, payment, wanted: wantedTime, ...form };
    const found = validateOrder(input, settings, catalog, availability?.closedToday, new Date(), availability?.hours);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSending(true);
    try {
      const response = await fetch("/api/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...input, locale, website: honeypot }),
      });
      const data = await response.json().catch(() => ({}));

      if (response.status === 201) {
        clear();
        router.push(data.statusUrl);
      } else if (response.status === 422 && data.errors) {
        setErrors(data.errors);
      } else if (SPECIAL_ERRORS.includes(data.code)) {
        setServerError(text.errors[data.code as SpecialError]);
      } else if (response.status === 429) {
        setServerError(text.errors.busy);
      } else {
        setServerError(text.errors.server);
      }
    } catch {
      setServerError(text.errors.server);
    } finally {
      setSending(false);
    }
  }

  function closedMessage() {
    if (!availability) return null;
    if (!availability.available) return text.unavailable;
    if (settings?.paused) return text.paused;
    if (!timeWindow?.open) return text.closed;
    return null;
  }

  const asapMinutes = method === "delivery" ? (settings?.deliveryMinutes ?? 45) : (settings?.pickupMinutes ?? 20);

  return (
    <div>
      <h1 className="font-display text-4xl font-semibold leading-[1.05] text-cream md:text-6xl">{text.title}</h1>
      <p className="mt-3 font-display text-xl italic text-cream/75 md:text-2xl">{text.lead}</p>

      {closedMessage() && (
        <p role="status" className="mt-8 border-l-2 border-[#f0a080] pl-4 text-cream/85">
          {closedMessage()}
        </p>
      )}

      <div className="mt-10 grid gap-12 lg:grid-cols-12">
        <MenuPicker
          menu={menu}
          isOrderable={(id) => catalog.has(id)}
          quantityOf={quantityOf}
          setQuantity={setQuantity}
          formatPrice={formatPrice}
        />

        <form id="checkout" onSubmit={placeOrder} noValidate className="lg:col-span-5">
          <div className="space-y-8 lg:sticky lg:top-8">
            {/* Delivery or pickup */}
            <div className="grid grid-cols-2 gap-2 rounded-full border border-gold/30 p-1">
              {(["delivery", "pickup"] as const).map((option) => {
                const enabled = settings ? (option === "delivery" ? settings.delivery : settings.pickup) : true;
                return (
                  <button
                    key={option}
                    type="button"
                    disabled={!enabled}
                    aria-pressed={method === option}
                    onClick={() => setMethod(option)}
                    className={`flex items-center justify-center gap-2 rounded-full py-2.5 text-sm font-semibold transition-colors disabled:opacity-40 ${
                      method === option ? "bg-gold text-ink" : "text-cream/75 hover:text-cream"
                    }`}
                  >
                    {option === "delivery" ? <Moped size={18} /> : <Storefront size={18} />}
                    {option === "delivery" ? text.delivery : text.pickup}
                  </button>
                );
              })}
            </div>

            {settings && (
              <p className="text-xs leading-relaxed text-cream/60">
                {method === "delivery" ? (
                  <>
                    {text.minOrder(formatPrice(settings.minOrder))}
                    {settings.freeDeliveryFrom > 0 && <> · {text.freeFrom(formatPrice(settings.freeDeliveryFrom))}</>}
                    <br />
                    {text.area(settings.postcodes.join(", "))}
                  </>
                ) : (
                  text.pickupAt
                )}
              </p>
            )}

            <Basket
              cart={cart}
              itemCount={itemCount}
              findDish={(id) => catalog.get(id)}
              method={method}
              prices={prices}
              formatPrice={formatPrice}
              error={errorText(errors.items)}
            />

            <Field id="wanted" label={text.when} error={errorText(errors.wanted)}>
              <select
                id="wanted"
                value={wantedTime}
                onChange={(event) => setWantedTime(event.target.value)}
                className={`${fieldClass} text-xl [color-scheme:dark]`}
                disabled={!timeWindow?.open}
              >
                {timeWindow?.asap && (
                  <option value="asap" className="bg-coal text-base">
                    {text.asap(asapMinutes)}
                  </option>
                )}
                {timeWindow?.slots.map((slot) => (
                  <option key={slot} value={slot} className="bg-coal text-base">
                    {text.later}: {t.clock(slot)}
                  </option>
                ))}
              </select>
            </Field>

            <AnimatePresence initial={false}>
              {method === "delivery" && (
                <motion.fieldset
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-6 overflow-hidden"
                >
                  <legend className="mb-2 font-display text-2xl text-cream">{text.address}</legend>
                  <Field id="street" label={text.street} error={errorText(errors.street)}>
                    <input
                      id="street"
                      autoComplete="street-address"
                      value={form.street}
                      onChange={(event) => updateField("street", event.target.value)}
                      className={`${fieldClass} text-xl`}
                    />
                  </Field>
                  <div className="grid grid-cols-[0.8fr_1.2fr] gap-6">
                    <Field id="postcode" label={text.postcode} error={errorText(errors.postcode)}>
                      <input
                        id="postcode"
                        inputMode="numeric"
                        autoComplete="postal-code"
                        maxLength={5}
                        value={form.postcode}
                        onChange={(event) => updateField("postcode", event.target.value)}
                        className={`${fieldClass} text-xl`}
                      />
                    </Field>
                    <Field id="city" label={text.city}>
                      <input
                        id="city"
                        autoComplete="address-level2"
                        value={form.city}
                        onChange={(event) => updateField("city", event.target.value)}
                        className={`${fieldClass} text-xl`}
                      />
                    </Field>
                  </div>
                  <Field id="addressNote" label={text.addressNote}>
                    <input
                      id="addressNote"
                      maxLength={200}
                      value={form.addressNote}
                      onChange={(event) => updateField("addressNote", event.target.value)}
                      className={`${fieldClass} text-lg`}
                    />
                  </Field>
                </motion.fieldset>
              )}
            </AnimatePresence>

            {account === null ? (
              <SignInPrompt />
            ) : (
              <>
                <fieldset className="space-y-6">
                  <legend className="mb-2 font-display text-2xl text-cream">{text.contact}</legend>
                  <Field id="name" label={text.name} error={errorText(errors.name)}>
                    <input
                      id="name"
                      autoComplete="name"
                      value={form.name}
                      onChange={(event) => updateField("name", event.target.value)}
                      className={`${fieldClass} text-xl`}
                    />
                  </Field>
                  <Field id="phone" label={text.phone} error={errorText(errors.phone)}>
                    <input
                      id="phone"
                      type="tel"
                      autoComplete="tel"
                      value={form.phone}
                      onChange={(event) => updateField("phone", event.target.value)}
                      className={`${fieldClass} text-xl`}
                    />
                  </Field>
                  {account && <p className="text-sm text-cream/65">{text.accountEmail(account.email)}</p>}
                  <Field id="note" label={text.note} error={errorText(errors.note)}>
                    <input
                      id="note"
                      maxLength={400}
                      value={form.note}
                      onChange={(event) => updateField("note", event.target.value)}
                      aria-describedby="note-hint"
                      className={`${fieldClass} text-lg`}
                    />
                  </Field>
                  <p id="note-hint" className="-mt-2 text-xs text-cream/55">
                    {text.noteHint}
                  </p>
                </fieldset>

                {settings?.reusable === "offer" && <PackagingNote>{text.reusableOffer}</PackagingNote>}
                {settings?.reusable === "own" && method === "pickup" && (
                  <PackagingNote>{text.reusableOwn}</PackagingNote>
                )}

                <fieldset>
                  <legend className="mb-3 font-display text-2xl text-cream">{text.payment}</legend>
                  <div className="grid grid-cols-2 gap-3">
                    {(["cash", "card"] as const).map((option) => (
                      <label
                        key={option}
                        className={`cursor-pointer rounded-full border px-4 py-2.5 text-center text-sm font-semibold transition-colors ${payment === option ? "border-gold bg-gold/15 text-gold-soft" : "border-cream/20 text-cream/70"}`}
                      >
                        <input
                          type="radio"
                          name="payment"
                          value={option}
                          checked={payment === option}
                          onChange={() => setPayment(option)}
                          className="sr-only"
                        />
                        {option === "cash" ? text.cash : text.card}
                      </label>
                    ))}
                  </div>
                </fieldset>

                <input
                  type="text"
                  name="website"
                  tabIndex={-1}
                  autoComplete="off"
                  aria-hidden
                  value={honeypot}
                  onChange={(event) => setHoneypot(event.target.value)}
                  className="absolute -left-[9999px] h-0 w-0 opacity-0"
                />

                {account && !account.emailVerified && <VerifyNotice email={account.email} />}
                {serverError && (
                  <p role="alert" className="text-sm text-[#f0a080]">
                    {serverError}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={!account || !account.emailVerified || !canOrder || sending || cart.length === 0}
                  className="group relative w-full overflow-hidden rounded-full btn-gild px-8 py-4 font-semibold text-ink hover:text-cream active:scale-[0.99] disabled:opacity-50"
                >
                  <span className="absolute inset-0 -translate-x-full bg-eth-green transition-transform duration-700 ease-[cubic-bezier(.22,1,.36,1)] group-hover:translate-x-0" />
                  <span className="relative">{sending ? text.placing : text.place(formatPrice(prices.total))}</span>
                </button>
              </>
            )}

            <p className="text-center text-xs leading-relaxed text-cream/55">
              {text.terms}{" "}
              <Link href="/bestellbedingungen" className="underline underline-offset-4">
                {text.termsLink}
              </Link>
              {" · "}
              <Link href="/datenschutz" className="underline underline-offset-4">
                {t.footer.privacy}
              </Link>
            </p>
          </div>
        </form>
      </div>

      {/* On phones: a bar that jumps down to the basket */}
      {itemCount > 0 && (
        <a
          href="#checkout"
          className="fixed inset-x-4 bottom-4 z-40 flex items-center justify-between rounded-full btn-gild px-6 py-3.5 font-semibold text-ink shadow-[0_20px_40px_-12px_rgba(0,0,0,0.7)] lg:hidden"
        >
          <span>
            {text.toCheckout} ({itemCount})
          </span>
          <span className="tabular-nums">{formatPrice(prices.total)}</span>
        </a>
      )}
    </div>
  );
}

/** Shown instead of the contact form to visitors who aren't signed in (ordering needs an account). */
function SignInPrompt() {
  const { t } = useLanguage();
  return (
    <div className="border border-gold/40 bg-gold/[0.05] p-6">
      <p className="font-display text-2xl text-cream">{t.order.loginTitle}</p>
      <p className="mt-2 text-sm leading-relaxed text-cream/75">{t.order.loginText}</p>
      <div className="mt-5 flex flex-wrap gap-3">
        <Link
          href="/login?next=/bestellen"
          className="rounded-full btn-gild px-6 py-3 text-sm font-semibold text-ink hover:bg-eth-green hover:bg-none hover:text-cream"
        >
          {t.order.loginButton}
        </Link>
        <Link
          href="/login?mode=register&next=/bestellen"
          className="rounded-full border border-gold/60 px-6 py-3 text-sm font-semibold text-gold-soft hover:bg-gold hover:text-ink"
        >
          {t.order.registerButton}
        </Link>
      </div>
    </div>
  );
}

function PackagingNote({ children }: { children: React.ReactNode }) {
  return <p className="border-l-2 border-[#7fcf9c]/60 pl-4 text-sm text-cream/75">{children}</p>;
}
