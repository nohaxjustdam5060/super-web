import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * ScrollToTop component
 * Automatically resets window scroll position to (0, 0) whenever the route (pathname, search params or location key) changes.
 */
export default function ScrollToTop() {
  const { pathname, search, key } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname, search, key]);

  return null;
}
