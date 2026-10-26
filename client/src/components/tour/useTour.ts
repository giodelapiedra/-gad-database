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
    const steps = stepsForPath(pathname).filter(
      (s: TourStep) => !s.element || document.querySelector(s.element),
    );
    if (steps.length === 0) return;

    const d = driver({
      showProgress: true,
      progressText: '{{current}} / {{total}}',
      overlayColor: 'rgba(9, 9, 11, 0.55)',
      stagePadding: 6,
      stageRadius: 8,
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
