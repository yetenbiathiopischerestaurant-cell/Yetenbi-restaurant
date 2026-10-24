"use client";

import { motion, useReducedMotion } from "motion/react";

/** The hero wordmark again, closing the page, fading through the flag's colours. */
export default function FooterWordmark() {
  const reduce = useReducedMotion();
  return (
    <motion.p
      className="flex select-none justify-center overflow-hidden whitespace-nowrap pb-[0.06em] font-display text-[19vw] font-bold leading-[0.9] tracking-[0.04em]"
      initial={reduce ? false : "hidden"}
      whileInView="show"
      viewport={{ once: true, margin: "-5% 0px" }}
      transition={{ staggerChildren: 0.07 }}
    >
      <span className="sr-only">Yetenbi</span>
      {"YETENBI".split("").map((letter, index) => (
        <motion.span
          key={index}
          aria-hidden
          className="inline-block bg-gradient-to-b from-eth-green/75 via-eth-yellow/75 to-eth-red/45 bg-clip-text text-transparent"
          variants={{
            hidden: { y: "105%", rotate: 8 },
            show: { y: "0%", rotate: 0, transition: { duration: 1.3, ease: [0.22, 1, 0.36, 1] } },
          }}
        >
          {letter}
        </motion.span>
      ))}
    </motion.p>
  );
}
