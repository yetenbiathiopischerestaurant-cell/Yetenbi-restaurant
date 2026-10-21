import Link from "next/link";
import CookieSettings from "./CookieSettings";

/* Impressum, Datenschutz and Bestellbedingungen, reachable from every page (§ 5 DDG, Art. 12 DSGVO). */
export default function LegalLinks({ className = "" }: { className?: string }) {
  const links = [
    { href: "/impressum", label: "Impressum" },
    { href: "/datenschutz", label: "Datenschutz" },
    { href: "/bestellbedingungen", label: "Bestellbedingungen" },
  ];
  return (
    <nav
      aria-label="Rechtliches"
      className={`flex flex-wrap justify-center gap-x-6 gap-y-1 text-xs text-cream/60 ${className}`}
    >
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className="underline-offset-4 transition-colors hover:text-gold-soft hover:underline"
        >
          {link.label}
        </Link>
      ))}
      <CookieSettings className="cursor-pointer underline-offset-4 transition-colors hover:text-gold-soft hover:underline" />
    </nav>
  );
}
