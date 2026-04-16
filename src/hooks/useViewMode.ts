/**
 * useViewMode — lets a partner account temporarily browse as a regular user.
 *
 * Mode is persisted in sessionStorage so it resets on browser close (feels
 * natural: the partner isn't "stuck" in user mode across sessions).
 *
 * Usage:
 *   const { isUserMode, enterUserMode, exitUserMode } = useViewMode();
 */

const KEY = 'tapn_view_mode';

function getStored(): boolean {
  try {
    return sessionStorage.getItem(KEY) === 'user';
  } catch {
    return false;
  }
}

function setStored(isUser: boolean) {
  try {
    if (isUser) {
      sessionStorage.setItem(KEY, 'user');
    } else {
      sessionStorage.removeItem(KEY);
    }
  } catch {
    // ignore
  }
}

export function isPartnerInUserMode(): boolean {
  return getStored();
}

export function enterUserMode() {
  setStored(true);
}

export function exitUserMode() {
  setStored(false);
}
