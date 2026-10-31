import type { KeyboardEvent } from 'react';
import { useId } from 'react';

import { Keyboard } from '@/constants';

const getDirection = (key: string): number => {
  switch (key) {
    case Keyboard.DOWN:
    case Keyboard.RIGHT:
      return 1;
    case Keyboard.UP:
    case Keyboard.LEFT:
      return -1;
    default:
      return 0;
  }
};

// Arrow-key navigation inside a group (toolbar, grid of tiles):
// returns the new index, or null if the key is not a navigation key.
const handleListNav = <T extends HTMLElement>(params: {
  event: KeyboardEvent<T>;
  active: number;
  total: number;
  setIndex: (i: number) => void;
}) => {
  const { event, active, total, setIndex } = params;
  let newIndex: number | null = null;

  if (event.key === Keyboard.HOME) newIndex = 0;
  else if (event.key === Keyboard.END) newIndex = total - 1;
  else {
    const direction = getDirection(event.key);
    if (direction !== 0) newIndex = (active + direction + total) % total;
  }

  if (newIndex === null) return null;
  event.preventDefault();
  setIndex(newIndex);
  return newIndex;
};

export default function useA11y() {
  const reactId = useId();

  const makeId = (id: string, ...inputs: Array<string>) => {
    return [id || reactId, ...inputs].filter(Boolean).join('_');
  };

  return {
    makeId,
    getDirection,
    handleListNav,
  };
}
