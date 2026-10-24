/*
  Small pieces of Ethiopian ornament used across the site:
  - LalibelaCross: the stepped cross that forms the roof of Bete Giyorgis, cut into the rock at Lalibela.
  - AksumFrame: the timber-and-stone window frame of Aksumite buildings, whose square beam ends
    ("monkey heads") project at the corners of each lintel.
  - Tibeb / Harag: woven border and manuscript interlace bands (patterns live in globals.css).
*/

export function LalibelaCross({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} fill="none" stroke="currentColor" strokeLinejoin="round" aria-hidden>
      {/* outer stepped cross, as the roof outline of Bete Giyorgis */}
      <path d="M12 1.5h8v5h4v4h6.5v11H24v4h-4v5h-8v-5H8v-4H1.5v-11H8v-4h4z" strokeWidth="1.4" />
      {/* inner nested cross */}
      <path d="M13.8 5.5h4.4v8.3h8.3v4.4h-8.3v8.3h-4.4v-8.3H5.5v-4.4h8.3z" strokeWidth="1" strokeOpacity="0.8" />
      {/* centre and arm ends */}
      <rect x="14.6" y="14.6" width="2.8" height="2.8" fill="currentColor" stroke="none" />
      <circle cx="16" cy="3.6" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="16" cy="28.4" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="3.6" cy="16" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="28.4" cy="16" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** A projecting beam end: a square block with a carved inner square in one of the flag's colours. */
function Knob({ className, tone }: { className: string; tone: "green" | "red" }) {
  return (
    <span
      aria-hidden
      className={`pointer-events-none absolute flex h-4 w-4 items-center justify-center border-[1.5px] border-gold bg-ink ${className}`}
    >
      <span className={`h-1.5 w-1.5 ${tone === "green" ? "bg-eth-green" : "bg-eth-red"}`} />
    </span>
  );
}

/** Wraps content in an Aksumite window frame: double stepped border, twin lintels and projecting beam ends. */
export function AksumFrame({
  children,
  className = "",
  inner = "",
}: {
  children: React.ReactNode;
  className?: string;
  inner?: string;
}) {
  return (
    <div className={`relative p-3 md:p-3.5 ${className}`}>
      <div aria-hidden className="pointer-events-none absolute inset-0 border-[1.5px] border-gold/75" />
      <div aria-hidden className="pointer-events-none absolute inset-[6px] border border-gold/35 md:inset-[7px]" />
      {/* twin lintel beams at top and bottom, running past the frame */}
      <span aria-hidden className="pointer-events-none absolute -left-4 -right-4 top-0 h-[1.5px] bg-gold/75" />
      <span aria-hidden className="pointer-events-none absolute -left-2 -right-2 top-[5px] h-px bg-gold/35" />
      <span aria-hidden className="pointer-events-none absolute -left-4 -right-4 bottom-0 h-[1.5px] bg-gold/75" />
      <span aria-hidden className="pointer-events-none absolute -left-2 -right-2 bottom-[5px] h-px bg-gold/35" />
      <Knob className="-left-5 -top-2" tone="green" />
      <Knob className="-right-5 -top-2" tone="green" />
      <Knob className="-bottom-2 -left-5" tone="red" />
      <Knob className="-bottom-2 -right-5" tone="red" />
      <div className={`relative overflow-hidden ${inner}`}>{children}</div>
    </div>
  );
}

/** A woven tibeb band, as on the hem of a habesha kemis. */
export function Tibeb({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`tibeb h-[26px] ${className}`} />;
}

/** A harag interlace band, as at the head of an illuminated Ge'ez manuscript page. */
export function Harag({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`harag h-[26px] ${className}`} />;
}
