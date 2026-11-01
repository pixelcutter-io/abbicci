import { useEffect } from 'react';

/** Sets the page title while the component is mounted. */
export default function useDocumentTitle(title: string) {
  useEffect(() => {
    const previous = document.title;
    document.title = title;
    return () => {
      document.title = previous;
    };
  }, [title]);
}
