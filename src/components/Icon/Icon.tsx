import Svg from 'react-inlinesvg';
import type { TA11y, TColor } from '@/types/components';

export interface IIcon {
  src?: string | { src: string };
  size?: number | number[] | string | string[];
  color?: TColor;
  onClick?: () => void;
  a11y?: TA11y;
  className?: string;
}

const Icon = (props: IIcon) => {
  const { size = 1, color = 'dark', onClick, a11y, className } = props;

  const src = typeof props.src === 'string' ? props.src : props.src?.src || '';

  const [widthSize, heightSize] = Array.isArray(size) ? size : [size, size];

  const width = typeof widthSize === 'number' ? `${widthSize}rem` : widthSize;
  const height =
    typeof heightSize === 'number' ? `${heightSize}rem` : heightSize;

  const fill = `var(--c-${color})`;
  return (
    <Svg
      className={className}
      src={src}
      width={width}
      height={height}
      fill={fill}
      onClick={onClick}
      role={a11y?.role}
      aria-hidden={a11y?.hidden || 'true'}
      aria-label={a11y?.label}
    />
  );
};

export default Icon;
