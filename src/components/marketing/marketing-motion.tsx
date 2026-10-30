"use client";

import { MotionConfig } from "motion/react";

// Con "prefers-reduced-motion", motion salta directo al estado final en
// transform/layout y deja solo los fundidos. Centralizado acá para no
// depender de useReducedMotion en cada `initial` (que en SSR no conoce la
// preferencia y puede desfasar la hidratación).
export function MarketingMotion({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
