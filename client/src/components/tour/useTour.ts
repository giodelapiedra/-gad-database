import { useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { stepsForPath, type TourStep } from './tourSteps';

/**
 * Starts the guided tour for whatever page the user is on. Steps whose target
 * element isn't in the DOM (e.g. a per-card step on an empty list) are dropped
 * so the walkthrough never points at nothing.
 */
export function useTour() {
  const { pathname } = useLocation();

  const start = useCallback(() => {
    // Keep only steps whose target is actually on screen — an element that is
    // absent, or present but collapsed/hidden (e.g. a closed sidebar), would
    // make the arrow point at nothing or the wrong spot.
    const isUsable = (s: TourStep) => {
      if (!s.element) return true;
      const el = document.querySelector(s.element);
      if (!el) return false;
      const r = el.getBoundingClientRect();
      return r.width > 4 && r.height > 4;
    };
    const steps = stepsForPath(pathname).filter(isUsable);
    if (steps.length === 0) return;

    const d = driver({
      showProgress: true,
      progressText: '{{current}} / {{total}}',
      overlayColor: 'rgba(9, 9, 11, 0.6)',
      stagePadding: 8,
      stageRadius: 10,
      popoverOffset: 12,
      popoverClass: 'gad-tour',
      nextBtnText: 'Susunod →',
      prevBtnText: '← Bumalik',
      doneBtnText: 'Tapos ✓',
      steps: steps.map((s) => ({
        element: s.element,
        popover: {
          title: s.title,
          description: s.description,
          side: s.side,
          align: s.align,
        },
      })),
    });

    d.drive();
  }, [pathname]);

  return { start };
}
