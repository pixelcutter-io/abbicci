import cx from 'clsx';
import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Button from '@/components/Button';
import Flex from '@/components/Flex';
import Typo from '@/components/Typo';
import useA11y from '@/hooks/useA11y';
import useSettings from '@/hooks/useSettings';
import s from './Settings.module.scss';
import { gear, xmark } from '@/assets/icons';
import Letters from './Letters';
import Stats from './Stats';
import Toggle from '@/components/Toggle';

export interface ISettings {
  className?: string;
}

const ID = 'settings';

/**
 * Settings button (gear) + modal panel: letters, stats, extra spacing.
 * <dialog> gives focus handling, Esc and an inert background for free.
 * The settings are mounted on first open and then kept, so they are only
 * built when needed and closing can animate.
 */
const Settings = (props: ISettings) => {
  const { className } = props;
  const ref = useRef<HTMLDialogElement>(null);
  const { makeId } = useA11y();
  const { t } = useTranslation();
  const { settings, update } = useSettings();
  const dialogId = makeId(ID, 'dialog');
  const titleId = makeId(ID, 'title');
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const onOpen = () => {
    setMounted(true);
    setOpen(true);
  };

  const onClose = useCallback(() => setOpen(false), []);

  // Open with showModal(); close only after the exit animation has run, so
  // the panel slides out instead of disappearing.
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return undefined;

    if (open) {
      delete dialog.dataset.closing;
      if (!dialog.open) dialog.showModal();
      return undefined;
    }

    if (!dialog.open) return undefined;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      dialog.close();
      return undefined;
    }

    const finish = (event: AnimationEvent) => {
      if (event.target !== dialog) return;
      dialog.removeEventListener('animationend', finish);
      delete dialog.dataset.closing;
      dialog.close();
    };
    dialog.addEventListener('animationend', finish);
    dialog.dataset.closing = 'true';
    return () => dialog.removeEventListener('animationend', finish);
  }, [open]);

  // Backdrop click and Esc go through onClose, so they get the exit
  // animation too. The content fills the dialog box, so a click whose target
  // is the <dialog> itself landed on the backdrop.
  useEffect(() => {
    const dialog = ref.current;
    const handleClick = (event: MouseEvent) => {
      if (event.target === dialog) onClose();
    };
    const handleCancel = (event: Event) => {
      event.preventDefault();
      onClose();
    };
    dialog?.addEventListener('click', handleClick);
    dialog?.addEventListener('cancel', handleCancel);
    return () => {
      dialog?.removeEventListener('click', handleClick);
      dialog?.removeEventListener('cancel', handleCancel);
    };
  }, [onClose]);

  const renderHeader = () => {
    return (
      <Flex justify={'space-between'} align={'center'} gap={1}>
        <Typo
          text={t('settings.title')}
          tag={'h2'}
          id={titleId}
          size={['xl', 'xxl']}
          sizeIncrease={1}
          weight={'semi'}
          lineHeight={'tight'}
        />
        <Button
          icon={xmark}
          onClick={onClose}
          theme={'ghost'}
          shape={'pill'}
          size={'db'}
          a11y={{ label: t('settings.close') }}
        />
      </Flex>
    );
  };

  const renderTrigger = () => {
    return (
      <Button
        icon={gear}
        onClick={onOpen}
        theme={'ghost'}
        shape={'pill'}
        size={'tr'}
        a11y={{
          label: t('settings.title'),
          haspopup: 'dialog',
          controls: dialogId,
          expanded: open,
        }}
      />
    );
  };

  const renderLetters = () => {
    if (!mounted) return null;
    return <Letters />;
  };

  // Mounted with the panel, so the counts are only computed once it is opened.
  const renderStats = () => {
    if (!mounted) return null;
    return <Stats />;
  };

  const renderReadibility = () => {
    return (
      <Toggle
        name={'extraSpacing'}
        label={t('settings.readability.extraSpacing')}
        value={settings.extraSpacing}
        onChange={({ value }) => update('extraSpacing', value)}
      />
    );
  };

  const renderDialog = () => {
    return (
      <dialog
        ref={ref}
        id={dialogId}
        aria-labelledby={titleId}
        className={cx(s.dialog, className)}
        onClose={onClose}
      >
        <Flex direction={'column'} align={'stretch'} gap={2.5}>
          {renderHeader()}
          {renderLetters()}
          {renderReadibility()}
          {renderStats()}
        </Flex>
      </dialog>
    );
  };

  return (
    <Fragment>
      {renderTrigger()}
      {renderDialog()}
    </Fragment>
  );
};

export default Settings;
