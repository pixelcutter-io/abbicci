import cx from 'clsx';
import { type ChangeEvent, useLayoutEffect, useRef } from 'react';
import Icon from '@/components/Icon';
import Typo from '@/components/Typo';
import useA11y from '@/hooks/useA11y';
import type { TA11y } from '@/types/components';
import s from './SegmentControl.module.scss';

export interface ISegmentOption<T> {
  /** Unique key, also used as the radio value. */
  key: string;
  value: T;
  label?: string;
  /** SVG source from `@/assets/icons`. */
  icon?: string;
  disabled?: boolean;
}

export interface ISegmentChange<T> {
  value: T;
  event: ChangeEvent<HTMLInputElement>;
}

export interface ISegmentControl<T> {
  options: ISegmentOption<T>[];
  value?: T;
  onChange: (params: ISegmentChange<T>) => void;
  name?: string;
  disabled?: boolean;
  className?: string;
  /** `label` names the group (rendered as a hidden <legend>). */
  a11y?: TA11y;
}

/**
 * Segmented single choice. Native radios in a <fieldset>: arrow keys,
 * focus and checked state come from the browser. Options are as wide as
 * their content; the indicator is measured on the checked option and slides
 * to it (--l-indicator-x, --l-indicator-w).
 */
const SegmentControl = <T,>(props: ISegmentControl<T>) => {
  const {
    options,
    value,
    onChange,
    name,
    disabled = false,
    className,
    a11y,
  } = props;
  const { makeId } = useA11y();
  const groupName = name ?? makeId('', 'segment');
  const activeIndex = options.findIndex((option) => option.value === value);
  const ref = useRef<HTMLFieldSetElement>(null);

  // Place the indicator under the checked option; re-measure on resize
  // (web font loaded, language changed...). CSS vars only: no re-render.
  useLayoutEffect(() => {
    const control = ref.current;
    if (!control) return undefined;

    const items = control.querySelectorAll<HTMLElement>(`.${s.option}`);

    const place = () => {
      const checked = items[activeIndex];
      if (!checked) return;
      control.style.setProperty('--l-indicator-x', `${checked.offsetLeft}px`);
      control.style.setProperty('--l-indicator-w', `${checked.offsetWidth}px`);
    };

    place();
    const observer = new ResizeObserver(place);
    observer.observe(control);
    for (const item of items) observer.observe(item);
    return () => observer.disconnect();
  }, [activeIndex]);

  const renderLegend = () => {
    if (!a11y?.label) return null;
    return <legend className={'srOnly'}>{a11y.label}</legend>;
  };

  const renderIcon = (option: ISegmentOption<T>) => {
    if (!option.icon) return null;
    return (
      <Icon src={option.icon} className={s.icon} a11y={{ hidden: true }} />
    );
  };

  const renderLabel = (option: ISegmentOption<T>) => {
    if (!option.label) return null;
    return (
      <Typo
        text={option.label}
        size={'df'}
        weight={'regular'}
        lineHeight={'tight'}
        className={s.label}
      />
    );
  };

  const renderOption = (option: ISegmentOption<T>, index: number) => {
    const checked = index === activeIndex;
    const isDisabled = disabled || option.disabled;
    return (
      <label
        key={option.key}
        className={cx(s.option, {
          [s.checked]: checked,
          [s.disabled]: isDisabled,
        })}
      >
        <input
          type={'radio'}
          name={groupName}
          value={option.key}
          checked={checked}
          disabled={isDisabled}
          onChange={(event) => onChange({ value: option.value, event })}
          className={s.input}
          aria-label={option.label ? undefined : option.key}
        />
        {renderIcon(option)}
        {renderLabel(option)}
      </label>
    );
  };

  return (
    <fieldset
      ref={ref}
      className={cx(s.control, className, {
        [s.hasValue]: activeIndex >= 0,
        [s.disabled]: disabled,
      })}
      disabled={disabled}
    >
      {renderLegend()}
      {options.map(renderOption)}
    </fieldset>
  );
};

export default SegmentControl;
