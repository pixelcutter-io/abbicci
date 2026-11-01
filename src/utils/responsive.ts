import type { TBreakpointKey, TResponsive } from '@/types/components';

export const BP_ORDER: TBreakpointKey[] = [
  'base',
  'sm',
  'md',
  'lg',
  'xl',
  'xxl',
];

const isBreakpointMap = <T>(
  value: TResponsive<T>,
): value is Partial<Record<TBreakpointKey, T>> =>
  typeof value === 'object' && value !== null;

/**
 * The value for every breakpoint, mobile first: a plain value applies to all
 * of them, a breakpoint without its own value repeats the previous one, and
 * `base` falls back to `defaultVal`.
 */
export const resolveResponsive = <T>(
  value: TResponsive<T> | undefined,
  defaultVal: T,
): Record<TBreakpointKey, T> => {
  let byBreakpoint: Partial<Record<TBreakpointKey, T>> = {};
  if (value !== undefined) {
    byBreakpoint = isBreakpointMap(value) ? value : { base: value };
  }

  // Written out key by key so TypeScript checks every breakpoint is there
  const base = byBreakpoint.base ?? defaultVal;
  const sm = byBreakpoint.sm ?? base;
  const md = byBreakpoint.md ?? sm;
  const lg = byBreakpoint.lg ?? md;
  const xl = byBreakpoint.xl ?? lg;
  const xxl = byBreakpoint.xxl ?? xl;
  return { base, sm, md, lg, xl, xxl };
};
