import { useLayoutEffect, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export default function useScrollRestoration() {
  const { pathname } = useLocation();

  // Load saved scroll position when route changes
  useLayoutEffect(() => {
    const savedPosition = sessionStorage.getItem(`scrollPos:${pathname}`);
    if (savedPosition) {
      window.scrollTo(0, parseInt(savedPosition, 10));
    } else {
      window.scrollTo(0, 0); // Default to top for new pages
    }
  }, [pathname]);

  // Save scroll position when navigating away or unmounting
  useEffect(() => {
    const handleScroll = () => {
      sessionStorage.setItem(`scrollPos:${pathname}`, window.scrollY.toString());
    };

    // Throttle the scroll listener to avoid performance hits
    let timeoutId = null;
    const scrollListener = () => {
      if (!timeoutId) {
        timeoutId = setTimeout(() => {
          handleScroll();
          timeoutId = null;
        }, 100);
      }
    };

    window.addEventListener('scroll', scrollListener);

    return () => {
      handleScroll(); // Save exactly on unmount
      window.removeEventListener('scroll', scrollListener);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [pathname]);
}
