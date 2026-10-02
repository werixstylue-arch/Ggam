// Pointer capture is optional: stale/synthetic pointer IDs must never interrupt play.
export function capturePointer(event) {
  try {
    if (Number.isInteger(event.pointerId) && event.currentTarget.setPointerCapture) {
      event.currentTarget.setPointerCapture(event.pointerId);
    }
  } catch { /* Continue with pointer-up/cancel handling when the browser has no active pointer. */ }
}