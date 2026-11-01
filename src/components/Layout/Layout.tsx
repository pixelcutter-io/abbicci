import cx from 'clsx';
import type { ReactNode } from 'react';
import Footer from '@/components/Layout/Footer';
import Header from '@/components/Layout/Header';
import type { TLayoutTheme } from '@/types/components';
import css from './Layout.module.scss';

export interface ILayout {
  children: ReactNode;
  theme?: TLayoutTheme;
}

/** Page shell shared by every route: header, content and footer. */
const Layout = (props: ILayout) => {
  const { children, theme = 'page' } = props;

  return (
    <div className={cx(css.layout, css[theme])}>
      <Header theme={theme} />
      <main className={css.main}>{children}</main>
      <Footer />
    </div>
  );
};

export default Layout;
