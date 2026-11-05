/**
 * Waits for a Firestore write to be confirmed, without hanging forever offline.
 *
 * A Firestore write only resolves once the *server* has acknowledged it. While
 * the device is offline that never happens, so a Save button that awaits it
 * would spin indefinitely even though the change is safely queued locally.
 *
 * Resolves:
 *  - "ok"      the server confirmed the write
 *  - "queued"  still unconfirmed after `ms`; it is kept locally and sent later
 * Rejects if the write fails before the timeout. If it fails *after* the
 * timeout (already reported as queued), `onLateFailure(error)` is called so the
 * problem is still surfaced.
 */
export const ACK_TIMEOUT_MS = 5000;

export function awaitAck(write, onLateFailure = () => {}, ms = ACK_TIMEOUT_MS) {
  return new Promise((resolve, reject) => {
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      resolve("queued");
    }, ms);

    Promise.resolve(write).then(
      () => {
        clearTimeout(timer);
        if (!timedOut) resolve("ok");
      },
      (error) => {
        clearTimeout(timer);
        if (timedOut) onLateFailure(error);
        else reject(error);
      }
    );
  });
}
