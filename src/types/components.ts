import type { AriaAttributes, AriaRole } from 'react';

/** Optional extra class names for named parts of a component. */
export type TClassnames<T extends string> = {
  [P in T]?: string;
};

export type TSize =
  | 'dc'
  | 'nn'
  | 'eg'
  | 'sp'
  | 'st'
  | 'qt'
  | 'qr'
  | 'tr'
  | 'big'
  | 'db'
  | 'xxl'
  | 'xl'
  | 'lg'
  | 'df'
  | 'md'
  | 'sm'
  | 'xs'
  | 'xxs'
  | 'us'
  | 'uxs'
  | 'uxxs';

export type TColor =
  | 'dark'
  | 'dark-2'
  | 'light'
  | 'light-2'
  | 'body'
  | 'accent'
  | 'accent-2'
  | 'accent-dark';

export type THtmlTag =
  | 'article'
  | 'aside'
  | 'div'
  | 'dl'
  | 'footer'
  | 'form'
  | 'header'
  | 'label'
  | 'section'
  | 'nav'
  | 'ul';

// Button
export type TButtonTheme = 'fill' | 'outline' | 'ghost' | 'text';
/** Button height, as a spacing token (--s-*): everything else scales with it. */
export type TButtonSize = Extract<TSize, 'db' | 'big' | 'tr' | 'qr' | 'qt'>;
export type TButtonShape = 'default' | 'pill';
export type TIconPosition = 'before' | 'after';

// Flex
export type TFlexDirection =
  'row' | 'row-reverse' | 'column' | 'column-reverse';
export type TFlexJustify =
  'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around';
export type TFlexAlign =
  'flex-start' | 'center' | 'flex-end' | 'stretch' | 'baseline';
export type TFlexWrap = 'nowrap' | 'wrap' | 'wrap-reverse';

// Typo
export type TTypoFamily = 'main';
export type TTypoTag = 'h1' | 'h2' | 'h3' | 'h4' | 'p' | 'label' | 'span';
export type TTypoSize = Exclude<TSize, 'us' | 'uxs' | 'uxxs'>;
export type TTypoWeight = 'light' | 'regular' | 'medium' | 'semi' | 'bold';
export type TTypoLineHeight = 'default' | 'tight';
export type TTypoAlign = 'left' | 'center' | 'right';
export type TTypoDecoration = 'none' | 'underline';

// Layout
/** 'reader': one screen, no scrolling. 'page': a text page that scrolls. */
export type TLayoutTheme = 'reader' | 'page';

// Responsive
export type TBreakpointKey = 'base' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl';
export type TResponsive<T> = T | Partial<Record<TBreakpointKey, T>>;

// A11y
export type TA11y = {
  role?: AriaRole;
  label?: AriaAttributes['aria-label'];
  hidden?: AriaAttributes['aria-hidden'];
  pressed?: AriaAttributes['aria-pressed'];
  checked?: AriaAttributes['aria-checked'];
  expanded?: AriaAttributes['aria-expanded'];
  controls?: AriaAttributes['aria-controls'];
  haspopup?: AriaAttributes['aria-haspopup'];
  live?: AriaAttributes['aria-live'];
  labelledBy?: AriaAttributes['aria-labelledby'];
  describedBy?: AriaAttributes['aria-describedby'];
  htmlFor?: string;
  tabIndex?: number;
};

// Allow local custom properties (--l-*) in `style` without casts.
declare module 'react' {
  interface CSSProperties {
    [key: `--${string}`]: string | number | undefined;
  }
}
