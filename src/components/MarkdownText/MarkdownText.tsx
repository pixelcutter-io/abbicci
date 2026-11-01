import cx from 'clsx';
import ReactMarkdown, { type Components } from 'react-markdown';
import { Link } from 'react-router';
import type {
  TClassnames,
  TColor,
  TResponsive,
  TTypoAlign,
  TTypoFamily,
  TTypoSize,
} from '@/types/components';
import { BP_ORDER, resolveResponsive } from '@/utils/responsive';
import css from './MarkdownText.module.scss';

export interface IMarkdownText {
  /** Markdown source. Raw HTML is not rendered. */
  text?: string;
  family?: TTypoFamily;
  baseSize?: TTypoSize | [TTypoSize, TTypoSize];
  sizeIncrease?: number;
  align?: TResponsive<TTypoAlign>;
  color?: TColor;
  columns?: number;
  dropCap?: boolean;
  classNames?: TClassnames<
    | 'text'
    | 'h1'
    | 'h2'
    | 'h3'
    | 'h4'
    | 'h5'
    | 'h6'
    | 'p'
    | 'ul'
    | 'ol'
    | 'li'
    | 'a'
    | 'strong'
    | 'em'
    | 'img'
    | 'hr'
    | 'code'
    | 'blockquote'
  >;
}

/**
 * Maps markdown elements to styled HTML. Headings go one level down (`#`
 * becomes <h2>, ...) because the page already has its own <h1>. Only the
 * props each element needs are passed on: react-markdown also hands over an
 * internal `node` prop that must not reach the DOM.
 */
const getComponents = (
  classNames: IMarkdownText['classNames'],
): Components => ({
  h1: ({ children }) => (
    <h2 className={cx(css.h1, classNames?.h1)}>{children}</h2>
  ),
  h2: ({ children }) => (
    <h3 className={cx(css.h2, classNames?.h2)}>{children}</h3>
  ),
  h3: ({ children }) => (
    <h4 className={cx(css.h3, classNames?.h3)}>{children}</h4>
  ),
  h4: ({ children }) => (
    <h5 className={cx(css.h4, classNames?.h4)}>{children}</h5>
  ),
  h5: ({ children }) => (
    <h6 className={cx(css.h5, classNames?.h5)}>{children}</h6>
  ),
  h6: ({ children }) => (
    <h6 className={cx(css.h6, classNames?.h6)}>{children}</h6>
  ),
  p: ({ children }) => <p className={cx(css.p, classNames?.p)}>{children}</p>,
  ul: ({ children }) => (
    <ul className={cx(css.ul, classNames?.ul)}>{children}</ul>
  ),
  ol: ({ children, start }) => (
    <ol className={cx(css.ol, classNames?.ol)} start={start}>
      {children}
    </ol>
  ),
  li: ({ children }) => (
    <li className={cx(css.li, classNames?.li)}>{children}</li>
  ),
  a: ({ children, href = '' }) => {
    const className = cx(css.a, classNames?.a);
    // Site paths use the router, so they don't reload the page
    if (href.startsWith('/')) {
      return (
        <Link to={href} className={className}>
          {children}
        </Link>
      );
    }
    const isExternal = /^https?:\/\//.test(href);
    return (
      <a
        href={href}
        className={className}
        target={isExternal ? '_blank' : undefined}
        rel={isExternal ? 'noopener noreferrer' : undefined}
      >
        {children}
      </a>
    );
  },
  strong: ({ children }) => (
    <strong className={cx(css.strong, classNames?.strong)}>{children}</strong>
  ),
  em: ({ children }) => (
    <em className={cx(css.em, classNames?.em)}>{children}</em>
  ),
  img: ({ src, alt = '' }) => (
    <img className={cx(css.img, classNames?.img)} src={src} alt={alt} />
  ),
  hr: () => <hr className={cx(css.hr, classNames?.hr)} />,
  code: ({ children }) => (
    <code className={cx(css.code, classNames?.code)}>{children}</code>
  ),
  blockquote: ({ children }) => (
    <blockquote className={cx(css.blockquote, classNames?.blockquote)}>
      {children}
    </blockquote>
  ),
});

const MarkdownText = (props: IMarkdownText) => {
  const {
    text,
    family = 'main',
    baseSize = 'df',
    sizeIncrease = 5,
    align = 'left',
    color = 'dark',
    columns = 1,
    dropCap = false,
    classNames,
  } = props;

  const [baseSizeMin, baseSizeMax] = Array.isArray(baseSize)
    ? baseSize
    : [baseSize, baseSize];

  // --l-align, --l-align-sm, ...: the media queries in the SCSS pick one
  const alignByBreakpoint = resolveResponsive(align, 'left');
  const alignVars = Object.fromEntries(
    BP_ORDER.map((bp) => [
      bp === 'base' ? '--l-align' : `--l-align-${bp}`,
      alignByBreakpoint[bp],
    ]),
  );

  if (!text) return null;

  return (
    <div
      className={cx(css.text, classNames?.text, {
        [css.dropCap]: dropCap,
        [css.multiCol]: columns > 1,
      })}
      style={{
        '--l-c': `var(--c-${color})`,
        '--l-ff': `var(--ff-${family})`,
        '--l-fs-min': `var(--fs-${baseSizeMin})`,
        '--l-fs-max': `var(--fs-${baseSizeMax})`,
        '--l-fs-increase': `${sizeIncrease}vw`,
        '--l-cols': columns,
        ...alignVars,
      }}
    >
      <ReactMarkdown components={getComponents(classNames)}>
        {text}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownText;
