"use client";

import { type HTMLMotionProps, useReducedMotion } from "motion/react";

const SPRING = { type: "spring", stiffness: 320, damping: 22, mass: 0.8 } as const;

/**
 * Motion props for a piece of paper resting at a slight tilt: on hover (and
 * keyboard focus inside it) it lifts and straightens with a spring. Under
 * reduced motion it stays put. The resting tilt is static styling, rendered
 * the same on the server and the client.
 */
export function useLift(tilt: number, lift: boolean): Pick<HTMLMotionProps<"div">, "style" | "whileHover" | "whileFocus" | "transition"> {
  const reduce = useReducedMotion();
  const moves = lift && !reduce;
  const lifted = { y: -6, rotate: tilt / 3 };

  return {
    style: { rotate: tilt },
    whileHover: moves ? lifted : undefined,
    whileFocus: moves ? lifted : undefined,
    transition: SPRING,
  };
}
