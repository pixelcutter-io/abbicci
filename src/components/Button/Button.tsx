import cx from 'clsx';
import type { MouseEvent } from 'react';
import Icon from '@/components/Icon';
import type {
  TA11y,
  TButtonShape,
  TButtonSize,
  TButtonTheme,
  TClassnames,
  TColor,
  TIconPosition,
} from '@/types/components';
import s from './Button.module.scss';

export interface IButton {
  label?: string;
  /** SVG source from `@/assets/icons`. */
  icon?: string;
  iconPosition?: TIconPosition;
  theme?: TButtonTheme;
  shape?: TButtonShape;
  size?: TButtonSize;
  /** Main color: background for "fill", label and border for the others. */
  bgColor?: TColor;
  /** Label color; by default "light" on "fill", otherwise `bgColor`. */
  labelColor?: TColor;
  width?: 'fit-content' | 'full';
  type?: 'button' | 'submit';
  disabled?: boolean;
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
  id?: string;
  classNames?: TClassnames<'button' | 'content' | 'label' | 'icon'>;
  a11y?: TA11y;
}

const Button = (props: IButton) => {
  const {
    label,
    icon,
    iconPosition = 'before',
    theme = 'fill',
    shape = 'default',
    size = 'tr',
    bgColor = 'accent',
    labelColor,
    width = 'fit-content',
    type = 'button',
    disabled = false,
    onClick,
    id,
    classNames,
    a11y,
  } = props;

  const labelToken = labelColor ?? (theme === 'fill' ? 'light' : bgColor);

  const renderIcon = () => {
    if (!icon) return null;
    return (
      <Icon
        src={icon}
        className={cx(s.icon, classNames?.icon)}
        a11y={{ hidden: true }}
      />
    );
  };

  const renderLabel = () => {
    if (!label) return null;
    return <span className={cx(s.label, classNames?.label)}>{label}</span>;
  };

  return (
    <button
      id={id}
      type={type === 'submit' ? 'submit' : 'button'}
      className={cx(s.btn, s[theme], classNames?.button, {
        [s.pill]: shape === 'pill',
        [s.full]: width === 'full',
        [s.onlyIcon]: icon && !label,
      })}
      style={{
        '--l-h': `var(--s-${size})`,
        '--l-color-bg': `var(--c-${bgColor})`,
        '--l-color-label': `var(--c-${labelToken})`,
        '--l-icon-position': iconPosition === 'before' ? 'row' : 'row-reverse',
      }}
      disabled={disabled}
      onClick={onClick}
      role={a11y?.role}
      tabIndex={a11y?.tabIndex}
      aria-label={a11y?.label}
      aria-pressed={a11y?.pressed}
      aria-expanded={a11y?.expanded}
      aria-controls={a11y?.controls}
      aria-haspopup={a11y?.haspopup}
      aria-describedby={a11y?.describedBy}
    >
      <span className={cx(s.content, classNames?.content)}>
        {renderIcon()}
        {renderLabel()}
      </span>
    </button>
  );
};

export default Button;
