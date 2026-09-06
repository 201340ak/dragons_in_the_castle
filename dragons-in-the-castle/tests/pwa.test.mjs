import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
void test('service worker never intercepts private API or authenticated responses', async () => {
  const source = await readFile(
    new URL('../public/sw.js', import.meta.url),
    'utf8',
  );
  const listeners = {};
  runInNewContext(source, {
    self: {
      location: { origin: 'https://castle.test' },
      addEventListener: (name, handler) => (listeners[name] = handler),
    },
    URL,
  });
  for (const request of [
    {
      method: 'POST',
      url: 'https://castle.test/api/game',
      headers: new Headers(),
    },
    {
      method: 'GET',
      url: 'https://castle.test/api/game',
      headers: new Headers(),
    },
    {
      method: 'GET',
      url: 'https://castle.test/castle.png',
      headers: new Headers({ Authorization: 'Bearer private' }),
    },
  ]) {
    let intercepted = false;
    listeners.fetch({ request, respondWith: () => (intercepted = true) });
    assert.equal(intercepted, false);
  }
});
void test('PWA icon assets match manifest sizes and exist', async () => {
  const manifest = JSON.parse(
    await readFile(
      new URL('../public/manifest.webmanifest', import.meta.url),
      'utf8',
    ),
  );
  assert.equal(manifest.display, 'standalone');
  for (const icon of manifest.icons) {
    const png = await readFile(
      new URL('../public' + icon.src, import.meta.url),
    );
    assert.equal(png.readUInt32BE(16), Number(icon.sizes.split('x')[0]));
    assert.equal(png.readUInt32BE(20), Number(icon.sizes.split('x')[1]));
  }
});
