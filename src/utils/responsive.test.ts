import { describe, expect, test } from 'bun:test';
import { BP_ORDER, resolveResponsive } from '@/utils/responsive';

describe('resolveResponsive', () => {
  test('a plain value applies to every breakpoint', () => {
    const resolved = resolveResponsive('center', 'left');
    expect(Object.keys(resolved)).toEqual(BP_ORDER);
    expect(Object.values(resolved).every((value) => value === 'center')).toBe(
      true,
    );
  });

  test('a missing value repeats the previous breakpoint', () => {
    expect(resolveResponsive({ base: 'left', md: 'center' }, 'right')).toEqual({
      base: 'left',
      sm: 'left',
      md: 'center',
      lg: 'center',
      xl: 'center',
      xxl: 'center',
    });
  });

  test('base falls back when it is not given', () => {
    const resolved = resolveResponsive({ md: 'center' }, 'left');
    expect(resolved.base).toBe('left');
    expect(resolved.sm).toBe('left');
    expect(resolved.md).toBe('center');
  });

  test('undefined uses the default everywhere', () => {
    const resolved = resolveResponsive(undefined, 'left');
    expect(Object.values(resolved).every((value) => value === 'left')).toBe(
      true,
    );
  });
});
