import { createWorker, OEM, PSM } from 'tesseract.js';

self.onmessage = async ({ data: { image, assetBase } }) => {
  let worker;
  try {
    worker = await createWorker(['kor', 'eng'], OEM.LSTM_ONLY, {
      workerPath: new URL('worker.min.js', assetBase).href,
      corePath: new URL('core', assetBase).href,
      langPath: new URL('lang', assetBase).href,
      gzip: false, cacheMethod: 'none',
      logger: ({ status, progress }) => self.postMessage({ type: 'progress', status, progress }),
      errorHandler: () => self.postMessage({ type: 'error' }),
    });
    await worker.setParameters({ tessedit_pageseg_mode: PSM.AUTO });
    const { data } = await worker.recognize(image);
    self.postMessage({ type: 'result', result: { text: data.text, confidence: data.confidence } });
  } catch { self.postMessage({ type: 'error' }); }
  finally { await worker?.terminate(); }
};
