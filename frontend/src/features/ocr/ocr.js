// Prototype's cancellable outer-worker design. The engine is loaded only on demand.
export async function recognizeLocal(image, { signal, onProgress = () => {} } = {}) {
  signal?.throwIfAborted();
  const engine = new Worker(new URL('./ocr-engine.worker.js', import.meta.url), { type: 'module' });
  let abort;
  try {
    return await new Promise((resolve, reject) => {
      abort = () => reject(new DOMException('OCR cancelled', 'AbortError'));
      signal?.addEventListener('abort', abort, { once: true });
      engine.onerror = (event) => { event.preventDefault(); reject(new Error('OCR_ENGINE_FAILED')); };
      engine.onmessage = ({ data }) => {
        if (data.type === 'progress') onProgress(data.status, data.progress);
        else if (data.type === 'result') resolve(data.result);
        else if (data.type === 'error') reject(new Error('OCR_ENGINE_FAILED'));
      };
      engine.postMessage({ image, assetBase: new URL(`${import.meta.env.BASE_URL}ocr/`, window.location.origin).href });
    });
  } finally {
    if (abort) signal?.removeEventListener('abort', abort);
    engine.terminate();
  }
}
