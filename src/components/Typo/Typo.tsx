import cx from 'clsx';
import {
  type CSSProperties,
  createElement,
  type ReactNode,
  type Ref,
  useMemo,
} from 'react';
import type {
  TA11y,
  TColor,
  TTypoAlign,
  TTypoDecoration,
  TTypoFamily,
  TTypoLineHeight,
  TTypoSize,
  TTypoTag,
  TTypoWeight,
} from '@/types/components';
import s from './Typo.module.scss';

export interface ITypo {
  /** Usually a string; a component for richer content (e.g. syllables). */
  text: ReactNode;
  tag?: TTypoTag;
  family?: TTypoFamily;
  size?: TTypoSize | [TTypoSize, TTypoSize];
  sizeIncrease?: number;
  weight?: TTypoWeight;
  lineHeight?: TTypoLineHeight;
  align?: TTypoAlign;
  decoration?: TTypoDecoration;
  color?: TColor;
  balancer?: boolean;
  lang?: string;
  ref?: Ref<HTMLElement>;
  id?: string;
  className?: string;
  a11y?: TA11y;
}

const Typo = (props: ITypo) => {
  const {
    text,
    tag = 'span',
    family = 'main',
    size = 'df',
    sizeIncrease = 5,
    weight = 'regular',
    lineHeight = 'default',
    align = 'left',
    decoration = 'none',
    color = 'dark',
    balancer = false,
    lang,
    ref,
    id,
    className,
    a11y,
  } = props;

  const [sizeMin, sizeMax] = Array.isArray(size) ? size : [size, size];

  const typoProps = useMemo(() => {
    return {
      id,
      lang,
      className: cx(s.typo, className, { [s.balancer]: balancer }),
      style: {
        '--l-c': `var(--c-${color})`,
        '--l-ff': `var(--ff-${family})`,
        '--l-fs-min': `var(--fs-${sizeMin})`,
        '--l-fs-max': `var(--fs-${sizeMax})`,
        '--l-fs-increase': `${sizeIncrease}vw`,
        '--l-fw': `var(--fw-${weight})`,
        '--l-lh': `var(--lh-${lineHeight})`,
        '--l-align': align,
        '--l-decoration': decoration,
      } satisfies CSSProperties,
      role: a11y?.role,
      tabIndex: a11y?.tabIndex,
      htmlFor: a11y?.htmlFor,
      'aria-label': a11y?.label,
      'aria-hidden': a11y?.hidden,
      'aria-live': a11y?.live,
    };
  }, [
    id,
    lang,
    family,
    weight,
    lineHeight,
    color,
    className,
    align,
    decoration,
    balancer,
    sizeIncrease,
    sizeMax,
    sizeMin,
    a11y?.role,
    a11y?.tabIndex,
    a11y?.htmlFor,
    a11y?.label,
    a11y?.hidden,
    a11y?.live,
  ]);

  const elementProps = { ref, ...typoProps };

  // The ref prop is only forwarded to the element, never read while rendering
  // eslint-disable-next-line react-hooks/refs
  return createElement(tag, elementProps, text);
};

export default Typo;
