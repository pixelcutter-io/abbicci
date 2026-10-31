import cx from 'clsx';
import type { ChangeEvent } from 'react';
import Flex from '@/components/Flex';
import Typo from '@/components/Typo';
import type { TA11y } from '@/types/components';
import s from './Toggle.module.scss';

export interface IToggleChange {
  name: string;
  id?: string;
  /** The new value. */
  value: boolean;
  event: ChangeEvent<HTMLInputElement>;
}

export interface IToggle {
  value?: boolean;
  name: string;
  onChange: (input: IToggleChange) => void;
  /** Visible text next to the switch; clicking it toggles too. */
  label?: string;
  disabled?: boolean;
  id?: string;
  className?: string;
  /** Use `label` or `labelledBy` when there is no visible `label`. */
  a11y?: TA11y;
}

/**
 * On/off switch: a native checkbox with role="switch" inside a <label>, so
 * focus, Space, checked state and labelling all come from the browser.
 */
const Toggle = (props: IToggle) => {
  const {
    value = false,
    name,
    onChange,
    label,
    disabled = false,
    id,
    className,
    a11y,
  } = props;

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange({ name, id, value: event.target.checked, event });
  };

  const renderLabel = () => {
    if (!label) return null;
    return (
      <Typo
        text={label}
        size={'lg'}
        sizeIncrease={0}
        weight={'regular'}
        className={s.label}
      />
    );
  };

  return (
    <Flex
      tag={'label'}
      justify={'space-between'}
      align={'center'}
      gap={1}
      className={cx(s.wrapper, className, { [s.disabled]: disabled })}
    >
      {renderLabel()}
      <span className={s.track}>
        <input
          type={'checkbox'}
          role={'switch'}
          id={id}
          name={name}
          checked={value}
          disabled={disabled}
          onChange={handleChange}
          className={s.input}
          aria-label={a11y?.label}
          aria-labelledby={a11y?.labelledBy}
          aria-describedby={a11y?.describedBy}
        />
        <span className={s.toggle} aria-hidden={true} />
      </span>
    </Flex>
  );
};

export default Toggle;
