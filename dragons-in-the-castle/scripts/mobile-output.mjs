import { rename } from 'node:fs/promises';
await rename('dist-mobile/mobile.html', 'dist-mobile/index.html');
