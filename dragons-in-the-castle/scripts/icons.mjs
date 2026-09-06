import { writeFile } from 'node:fs/promises';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Castle } from 'lucide-react';
import sharp from 'sharp';
const svg = renderToStaticMarkup(
  createElement(Castle, {
    width: 512,
    height: 512,
    color: '#e3b768',
    strokeWidth: 1.3,
    style: { background: '#101d2d', padding: '100px' },
  }),
);
await writeFile('public/favicon.svg', svg);
for (const size of [192, 512])
  await sharp(Buffer.from(svg))
    .resize(size, size)
    .png()
    .toFile(`public/icon-${size}.png`);
