import { createContext, useContext } from 'react';
import type { MotionValue } from 'framer-motion';

/**
 * Shares the raw scrollYProgress from ContainerScroll
 * so child components (TapnProductMock, etc.) can drive
 * micro-animations off the same scroll signal.
 */
export const ShowcaseContext = createContext<MotionValue<number> | null>(null);

export function useShowcaseProgress() {
  return useContext(ShowcaseContext);
}
