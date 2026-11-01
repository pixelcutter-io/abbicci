import cx from 'clsx';
import {
  type CSSProperties,
  createElement,
  type ReactNode,
  type Ref,
} from 'react';
import type {
  TA11y,
  TFlexAlign,
  TFlexDirection,
  TFlexJustify,
  TFlexWrap,
  THtmlTag,
} from '@/types/components';
import s from './Flex.module.scss';

export interface IFlex {
  children: ReactNode;
  ref?: Ref<HTMLElement>;
  tag?: THtmlTag;
  width?: 'full' | 'fit-content';
  direction?: TFlexDirection;
  justify?: TFlexJustify;
  align?: TFlexAlign;
  wrap?: TFlexWrap;
  gap?: number | [number, number];
  onClick?: () => void;
  className?: string;
  style?: CSSProperties;
  a11y?: TA11y;
}

const Flex = (props: IFlex) => {
  const {
    children,
    ref,
    tag = 'div',
    width = 'full',
    direction = 'row',
    justify = 'flex-start',
    align = 'flex-start',
    wrap = 'nowrap',
    gap = 0,
    onClick,
    className,
    style,
    a11y,
  } = props;

  const [rowGap, colGap] = Array.isArray(gap) ? gap : [gap, gap];

  const flexProps = {
    ref,
    onClick,
    role: a11y?.role,
    tabIndex: a11y?.tabIndex,
    'aria-label': a11y?.label,
    'aria-labelledby': a11y?.labelledBy,
    'aria-hidden': a11y?.hidden,
    'aria-live': a11y?.live,
    className: cx(s.wrapper, className, { [s.hasClick]: onClick }),
    style: {
      '--l-width': width === 'full' ? '100%' : 'fit-content',
      '--l-direction': direction,
      '--l-justify': justify,
      '--l-align': align,
      '--l-row-gap': rowGap,
      '--l-column-gap': colGap,
      '--l-wrap': wrap,
      ...style,
    } satisfies CSSProperties,
  };

  return createElement(tag, flexProps, children);
};

export default Flex;
