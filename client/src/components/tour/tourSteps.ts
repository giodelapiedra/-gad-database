// Guided-tour step definitions, keyed by page. Copy is in Taglish for LGU
// encoders — polished and professional. Each step points at a real element via
// a `data-tour="…"` selector; steps whose element is missing on the current
// page are skipped at runtime (see useTour), so a page with no data still gets
// a sensible walkthrough.

export interface TourStep {
  /** CSS selector of the element to highlight. Omit for a centered intro card. */
  element?: string;
  title: string;
  /** Supports simple HTML (e.g. <b>…</b>). */
  description: string;
  side?: 'top' | 'bottom' | 'left' | 'right';
  align?: 'start' | 'center' | 'end';
}

// ── Reusable steps that point at the always-present app chrome ────────────────

const INTRO: TourStep = {
  title: 'Maligayang pagdating 👋',
  description:
    'Narito ang maikling gabay sa paggamit ng <b>GAD System</b>. Pindutin ang <b>Susunod</b> at ipapakita ko kung para saan ang bawat bahagi. Maaari mong ulitin ang gabay anumang oras sa pamamagitan ng <b>Demo</b> na button.',
};

const NAV_TEMPLATES: TourStep = {
  element: '[data-tour="nav-templates"]',
  title: 'GAD Templates',
  description:
    'Dito ka magsisimula. Piliin ang form na nais mong punan — <b>Barangay</b> o <b>City</b>, Plan &amp; Budget (GPB) o Accomplishment Report (AR).',
  side: 'right',
  align: 'start',
};

const NAV_MYSUBS: TourStep = {
  element: '[data-tour="nav-mysubs"]',
  title: 'My Submissions',
  description: 'Dito mo masusubaybayan ang lahat ng iyong isinumite, kasama ang kasalukuyang status ng bawat isa.',
  side: 'right',
  align: 'start',
};

const NOTIF_BELL: TourStep = {
  element: '[data-tour="notif-bell"]',
  title: 'Mga Abiso',
  description:
    'Dito lalabas ang abiso kapag <b>na-aprubahan</b> o <b>naibalik para sa pagwawasto</b> ng admin ang iyong form.',
  side: 'bottom',
  align: 'end',
};

const DEMO_BTN: TourStep = {
  element: '[data-tour="demo-btn"]',
  title: 'Handa ka na! 🎉',
  description: 'Natapos mo na ang gabay. Pindutin ang <b>Demo</b> na button anumang oras upang muli itong panoorin.',
  side: 'bottom',
  align: 'end',
};

// ── Per-page tours ───────────────────────────────────────────────────────────

const TEMPLATES_TOUR: TourStep[] = [
  INTRO,
  NAV_TEMPLATES,
  {
    element: '[data-tour="tpl-card"]',
    title: 'Mga Form',
    description:
      'Bawat card ay isang opisyal na GAD form. Makikita mo ang uri nito (Plan &amp; Budget o Accomplishment Report) at isang maikling paglalarawan.',
    side: 'top',
    align: 'start',
  },
  {
    element: '[data-tour="tpl-fill"]',
    title: 'Punan Online',
    description:
      'Pindutin ang <b>Fill Form Online</b> upang punan ang form dito mismo — hindi mo na kailangan ng Excel. Isusumite ito para sa pag-apruba kapag tapos na.',
    side: 'top',
    align: 'center',
  },
  NAV_MYSUBS,
  NOTIF_BELL,
  DEMO_BTN,
];

const MYSUBS_TOUR: TourStep[] = [
  INTRO,
  {
    element: '[data-tour="subs-stats"]',
    title: 'Buod ng Status',
    description:
      'Mabilis na pangkalahatang-tanaw: kabuuan, <b>Drafts</b>, <b>Pending Review</b>, <b>Approved</b>, at <b>Returned</b>.',
    side: 'bottom',
    align: 'start',
  },
  {
    element: '[data-tour="subs-tabs"]',
    title: 'Salain ayon sa Status',
    description: 'Gamitin ang mga tab upang ipakita lamang ang draft, pending, approved, o returned.',
    side: 'bottom',
    align: 'start',
  },
  {
    element: '[data-tour="subs-card"]',
    title: 'Ang Iyong Form',
    description:
      'Bawat card ay isang form na iyong isinumite. I-click ito upang makita ang detalye at ang progreso: <b>Submitted → Reviewed → Approved</b>.',
    side: 'top',
    align: 'start',
  },
  {
    element: '[data-tour="subs-status"]',
    title: 'Kahulugan ng mga Kulay',
    description:
      '<b>Amber</b> — Pending (hinihintay i-review). &nbsp;<b>Green</b> — Approved. &nbsp;<b>Orange</b> — Returned (may dapat iwasto).',
    side: 'left',
    align: 'center',
  },
  {
    element: '[data-tour="subs-actions"]',
    title: 'Mga Aksyon',
    description:
      '<b>View</b> upang buksan. Kung <b>Returned</b>, may <b>Edit</b> upang iwasto at muling isumite. Kung <b>Approved</b>, maaari nang i-download ang Excel.',
    side: 'left',
    align: 'center',
  },
  NOTIF_BELL,
  DEMO_BTN,
];

// A minimal tour for any other encoder page (view/edit) so the Demo button
// always does something useful.
const DEFAULT_TOUR: TourStep[] = [INTRO, NAV_TEMPLATES, NAV_MYSUBS, NOTIF_BELL, DEMO_BTN];

/** Pick the tour for the current route. */
export function stepsForPath(pathname: string): TourStep[] {
  if (pathname.startsWith('/my-submissions')) return MYSUBS_TOUR;
  if (pathname.startsWith('/templates')) return TEMPLATES_TOUR;
  return DEFAULT_TOUR;
}
