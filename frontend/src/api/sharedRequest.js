// Share concurrent reads; cancelling one consumer must not cancel another's read.
export function createSharedRequest(loader) {
  const pending = new Map();
  return (key, signal, ...args) => {
    if (signal?.aborted) return Promise.reject(new DOMException('Aborted', 'AbortError'));
    let entry = pending.get(key);
    if (!entry) {
      const controller = new AbortController();
      entry = { controller, consumers: 0 };
      entry.promise = Promise.resolve().then(() => loader(controller.signal, ...args)).finally(() => {
        if (pending.get(key) === entry) pending.delete(key);
      });
      pending.set(key, entry);
    }
    entry.consumers += 1;
    return new Promise((resolve, reject) => {
      let done = false;
      const finish = (callback, value) => {
        if (done) return;
        done = true;
        signal?.removeEventListener('abort', abort);
        entry.consumers -= 1;
        if (!entry.consumers) {
          if (pending.get(key) === entry) pending.delete(key);
          entry.controller.abort();
        }
        callback(value);
      };
      const abort = () => finish(reject, new DOMException('Aborted', 'AbortError'));
      signal?.addEventListener('abort', abort, { once: true });
      entry.promise.then((value) => finish(resolve, value), (error) => finish(reject, error));
    });
  };
}

export function abortableDelay(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) { reject(new DOMException('Aborted', 'AbortError')); return; }
    const abort = () => { clearTimeout(timer); reject(new DOMException('Aborted', 'AbortError')); };
    const timer = setTimeout(() => { signal?.removeEventListener('abort', abort); resolve(); }, ms);
    signal?.addEventListener('abort', abort, { once: true });
  });
}
