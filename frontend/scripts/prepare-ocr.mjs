import { mkdir, readFile, writeFile, copyFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('..', import.meta.url));
const output = path.join(root, 'public/ocr');
const prototype = path.resolve(root, '../experiments/ocr-learning/public/ocr');
const require = createRequire(import.meta.url);
const packageRoot = (name) => path.dirname(require.resolve(`${name}/package.json`));
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');
const files = [];
for (const name of ['core', 'lang', 'licenses']) await mkdir(path.join(output, name), { recursive: true });
async function copy(source, relative) {
  const bytes = await readFile(source);
  await copyFile(source, path.join(output, relative));
  files.push({ path: relative, bytes: bytes.length, sha256: digest(bytes) });
}
await copy(path.join(packageRoot('tesseract.js'), 'dist/worker.min.js'), 'worker.min.js');
for (const name of ['tesseract-core.wasm.js', 'tesseract-core-simd.wasm.js', 'tesseract-core-lstm.wasm.js', 'tesseract-core-simd-lstm.wasm.js']) {
  await copy(path.join(packageRoot('tesseract.js-core'), name), `core/${name}`);
}
await copy(path.join(packageRoot('tesseract.js'), 'LICENSE.md'), 'licenses/tesseract.js.txt');
await copy(path.join(packageRoot('tesseract.js-core'), 'LICENSE'), 'licenses/tesseract.js-core.txt');
const models = [
  ['eng.traineddata', 'lang/eng.traineddata', '7d4322bd2a7749724879683fc3912cb542f19906c83bcc1a52132556427170b2'],
  ['kor.traineddata', 'lang/kor.traineddata', '6b85e11d9bbf07863b97b3523b1b112844c43e713df8b66418a081fd1060b3b2'],
  ['LICENSE', 'licenses/tessdata_fast.txt', 'cfc7749b96f63bd31c3c42b5c471bf756814053e847c10f3eb003417bc523d30'],
];
for (const [remote, relative, expected] of models) {
  let bytes;
  for (const source of [path.join(output, relative), path.join(prototype, relative)]) {
    try { bytes = await readFile(source); break; } catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  if (!bytes) {
    const response = await fetch(`https://raw.githubusercontent.com/tesseract-ocr/tessdata_fast/4.1.0/${remote}`, { signal: AbortSignal.timeout(60_000) });
    if (!response.ok) throw new Error(`OCR model download failed: HTTP ${response.status}`);
    bytes = Buffer.from(await response.arrayBuffer());
  }
  if (digest(bytes) !== expected) throw new Error(`OCR model SHA-256 mismatch: ${remote}`);
  await writeFile(path.join(output, relative), bytes);
  files.push({ path: relative, bytes: bytes.length, sha256: expected });
}
const manifest = {
  engine: require('tesseract.js/package.json').version,
  core: require('tesseract.js-core/package.json').version,
  model: 'tessdata_fast 4.1.0 kor+eng (Apache-2.0)',
  totalBytes: files.reduce((sum, file) => sum + file.bytes, 0), files,
};
await writeFile(path.join(output, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(`OCR assets ready: ${(manifest.totalBytes / 1048576).toFixed(2)} MiB; runtime uses this site's static assets only.`);
