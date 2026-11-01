import { type RefObject, useEffect, useLayoutEffect } from 'react';

export interface IFitText {
  /** Area the text has to fit in. */
  box: RefObject<HTMLElement | null>;
  /** The text element: its inline font size is set here. */
  text: RefObject<HTMLElement | null>;
  /** Smallest and largest font size, in rem. */
  minRem: number;
  maxRem: number;
}

/** Binary-searches the real layout for the largest size that fits. */
const fitText = (
  box: HTMLElement | null,
  text: HTMLElement | null,
  minRem: number,
  maxRem: number,
) => {
  if (!box || !text) return;

  const rootPx = Number.parseFloat(
    getComputedStyle(document.documentElement).fontSize,
  );
  let low = minRem * rootPx;
  let high = maxRem * rootPx;

  const fits = (size: number) => {
    text.style.fontSize = `${size}px`;
    return (
      text.scrollHeight <= box.clientHeight &&
      text.scrollWidth <= box.clientWidth
    );
  };

  // Short texts fit at the largest size; very long ones stay at the
  // smallest and the box scrolls as a last resort.
  if (fits(high) || !fits(low)) return;

  while (high - low > 1) {
    const middle = (low + high) / 2;
    if (fits(middle)) low = middle;
    else high = middle;
  }
  text.style.fontSize = `${low}px`;
};

/**
 * Sets the largest font size (between `minRem` and `maxRem`) at which the
 * text still fits the box, both in width and height, so the page never has
 * to scroll. It measures the real layout, so it follows the actual screen,
 * orientation, web font and letter spacing.
 */
export default function useFitText(props: IFitText) {
  const { box, text, minRem, maxRem } = props;

  // After every render: the text, its case or its spacing may have changed.
  useLayoutEffect(() => {
    fitText(box.current, text.current, minRem, maxRem);
  });

  // Window resize, rotation, and the web font arriving late.
  useEffect(() => {
    const refit = () => fitText(box.current, text.current, minRem, maxRem);
    const observer = new ResizeObserver(refit);
    if (box.current) observer.observe(box.current);
    void document.fonts.ready.then(refit);
    return () => observer.disconnect();
  }, [box, text, minRem, maxRem]);
}
