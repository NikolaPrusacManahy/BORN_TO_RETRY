// M1 — asks before leaving the page during a run, so a stray Ctrl+W doesn't end it silently.

const onBeforeUnload = (e: BeforeUnloadEvent) => {
  e.preventDefault();
  e.returnValue = '';
};

export function setLeaveGuard(on: boolean) {
  if (on) window.addEventListener('beforeunload', onBeforeUnload);
  else window.removeEventListener('beforeunload', onBeforeUnload);
}
