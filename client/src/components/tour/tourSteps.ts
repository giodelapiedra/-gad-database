// Guided-tour step definitions, keyed by page. Copy is in Taglish for LGU
// encoders. Each step points at a real element via a `data-tour="…"` selector;
// steps whose element is missing on the current page are skipped at runtime
// (see useTour), so a page with no data still gets a sensible walkthrough.

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
  title: '👋 Maligayang pagdating!',
  description:
    'Ito ang mabilis na gabay sa GAD System. Pindutin ang <b>Susunod</b> at ituturo ko kung para saan ang bawat parte. Puwede mong ulitin ito anumang oras sa <b>Demo</b> na button sa itaas.',
};

const NAV_TEMPLATES: TourStep = {
  element: '[data-tour="nav-templates"]',
  title: '📋 GAD Templates',
  description: 'Dito ka magsisimula. Pumili ng form na pupunan — Barangay o City, Plan & Budget (GPB) o Accomplishment Report (AR).',
  side: 'right',
  align: 'start',
};

const NAV_MYSUBS: TourStep = {
  element: '[data-tour="nav-mysubs"]',
  title: '📊 My Submissions',
  description: 'Dito mo masusubaybayan lahat ng isinumite mong form at ang status ng bawat isa.',
  side: 'right',
  align: 'start',
};

const NAV_HGDG: TourStep = {
  element: '[data-tour="nav-hgdg"]',
  title: '✅ HGDG Checklists',
  description: 'Para sa Harmonized Gender and Development Guidelines na checklist, nandito.',
  side: 'right',
  align: 'start',
};

const NOTIF_BELL: TourStep = {
  element: '[data-tour="notif-bell"]',
  title: '🔔 Mga Abiso',
  description: 'Dito lalabas ang notification kapag <b>na-approve</b> o <b>na-return</b> (may itatama) ng admin ang form mo.',
  side: 'bottom',
  align: 'end',
};

const DEMO_BTN: TourStep = {
  element: '[data-tour="demo-btn"]',
  title: '🎉 Tapos na!',
  description: 'Pindutin ang <b>Demo</b> na ito anumang oras para ulitin ang gabay. Balikan mo lang kapag may nalimutan.',
  side: 'bottom',
  align: 'end',
};

// ── Per-page tours ───────────────────────────────────────────────────────────

const TEMPLATES_TOUR: TourStep[] = [
  INTRO,
  NAV_TEMPLATES,
  {
    element: '[data-tour="tpl-card"]',
    title: 'Ang mga form',
    description: 'Bawat kahon ay isang GAD form. Makikita mo ang uri (Plan & Budget o Accomplishment Report) at maikling paliwanag.',
    side: 'top',
    align: 'start',
  },
  {
    element: '[data-tour="tpl-fill"]',
    title: 'Punan online',
    description: 'Pindutin ang <b>Fill Form Online</b> para simulan punan ang form dito mismo — hindi mo na kailangan ng Excel. Pagkatapos, i-submit for approval.',
    side: 'top',
    align: 'center',
  },
  NAV_MYSUBS,
  NAV_HGDG,
  NOTIF_BELL,
  DEMO_BTN,
];

const MYSUBS_TOUR: TourStep[] = [
  INTRO,
  {
    element: '[data-tour="subs-stats"]',
    title: 'Buod ng status',
    description: 'Mabilis na tingin: ilan lahat, <b>Drafts</b>, <b>Pending Review</b>, <b>Approved</b>, at <b>Returned</b>.',
    side: 'bottom',
    align: 'start',
  },
  {
    element: '[data-tour="subs-tabs"]',
    title: 'Salain ayon sa status',
    description: 'Gamitin ang mga tab para ipakita lang ang draft, pending, approved, o returned.',
    side: 'bottom',
    align: 'start',
  },
  {
    element: '[data-tour="subs-card"]',
    title: 'Ang iyong form',
    description: 'Bawat kahon ay isang isinumite mo. I-click para makita ang detalye at ang progreso: <b>Submitted → Reviewed → Approved</b>.',
    side: 'top',
    align: 'start',
  },
  {
    element: '[data-tour="subs-status"]',
    title: 'Ano ang ibig sabihin ng kulay',
    description: 'Ang badge ang status: <b>Amber</b> = Pending (hinihintay i-review), <b>Green</b> = Approved, <b>Orange</b> = Returned (may itatama ka).',
    side: 'left',
    align: 'center',
  },
  {
    element: '[data-tour="subs-actions"]',
    title: 'Mga aksyon',
    description: '<b>View</b> para buksan. Kapag <b>Returned</b>, may <b>Edit</b> para itama at i-submit ulit. Kapag <b>Approved</b>, puwede nang i-download ang Excel.',
    side: 'left',
    align: 'center',
  },
  NOTIF_BELL,
  DEMO_BTN,
];

// A minimal tour for any other encoder page (view/edit/HGDG) so the Demo button
// always does something useful.
const DEFAULT_TOUR: TourStep[] = [INTRO, NAV_TEMPLATES, NAV_MYSUBS, NAV_HGDG, NOTIF_BELL, DEMO_BTN];

/** Pick the tour for the current route. */
export function stepsForPath(pathname: string): TourStep[] {
  if (pathname.startsWith('/my-submissions')) return MYSUBS_TOUR;
  if (pathname.startsWith('/templates')) return TEMPLATES_TOUR;
  return DEFAULT_TOUR;
}
