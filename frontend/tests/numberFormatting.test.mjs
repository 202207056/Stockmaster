import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';
import { comma, won, rate, rateWithMark, wonShort } from '../src/utils/format.js';

const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost/' });
Object.assign(globalThis, { window: dom.window, document: dom.window.document,
  HTMLElement: dom.window.HTMLElement, IS_REACT_ACT_ENVIRONMENT: true });
const React = await import('react');
const { createRoot } = await import('react-dom/client');
const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom', envFile: false });
const { default: NumberInput } = await server.ssrLoadModule('/src/components/common/NumberInput.jsx');
after(async () => { await server.close(); dom.window.close(); });

test('grouped amounts and rates preserve signs, precision, and empty fallbacks', () => {
  assert.equal(comma('1234567.89'), '1,234,567.89');
  assert.equal(won(-1234567), '-1,234,567원');
  assert.equal(rate(1234.5), '+1,234.50%');
  assert.equal(rateWithMark(-1234.5), '▼ 1,234.50%');
  assert.equal(wonShort(12340000), '1,234만');
  assert.equal(comma(null), '0');
});

test('grouped input sends raw digits, keeps the caret, and validates bounds and required values', async () => {
  const root = createRoot(document.getElementById('root'));
  let received;
  function Form() {
    const [value, setValue] = React.useState('1234');
    return React.createElement('form', null, React.createElement(NumberInput, {
      value, min: 1, max: 1000000, required: true,
      onChange: event => { received = event.target.value; setValue(received); },
    }));
  }
  await React.act(async () => root.render(React.createElement(Form)));
  const field = document.querySelector('input');
  const enter = async value => React.act(async () => {
    Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, 'value').set.call(field, value);
    field.setSelectionRange(value.length, value.length);
    field.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  });
  assert.equal(field.value, '1,234');
  await enter('12,345');
  assert.equal(received, '12345');
  assert.equal(field.value, '12,345');
  assert.equal(field.selectionStart, 6);
  assert.equal(field.checkValidity(), true);
  await enter('1,000,001');
  assert.equal(field.checkValidity(), false);
  await enter('');
  assert.equal(received, '');
  assert.equal(field.checkValidity(), false);
  await enter('1000');
  assert.equal(field.value, '1,000');
  assert.equal(field.checkValidity(), true);
  await enter('1e3');
  assert.equal(received, '1000');
  await React.act(async () => root.unmount());
});
