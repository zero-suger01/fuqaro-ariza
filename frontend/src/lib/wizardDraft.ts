const DRAFT_KEY = "e-murojaat-wizard-draft";

export interface WizardDraft {
  step: 1 | 2 | 3;
  description: string;
  categoryCode: string | null;
  neighborhoodId: string | null;
  address: string;
  latitude: number | null;
  longitude: number | null;
  firstName: string;
  phoneDigits: string;
}

export const EMPTY_DRAFT: WizardDraft = {
  step: 1,
  description: "",
  categoryCode: null,
  neighborhoodId: null,
  address: "",
  latitude: null,
  longitude: null,
  firstName: "",
  phoneDigits: "",
};

// Images/audio/video can't be persisted to localStorage (not serializable),
// so a resumed draft only restores text fields — the citizen re-attaches media.
export function loadDraft(): WizardDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as WizardDraft;
    if (!parsed.description && !parsed.firstName && !parsed.phoneDigits) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveDraft(draft: WizardDraft): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
}

export function clearDraft(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(DRAFT_KEY);
}
