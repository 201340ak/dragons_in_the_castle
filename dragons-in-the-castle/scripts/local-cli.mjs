import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
const mode = process.argv[2];
const env = {
  ...process.env,
  WRANGLER_WRITE_LOGS: 'false',
  WRANGLER_LOG_PATH: '.wrangler/logs',
  MINIFLARE_REGISTRY_PATH: '.wrangler/registry',
  WRANGLER_SEND_METRICS: 'false',
};
function run(args) {
  return new Promise((done, reject) => {
    const child = spawn(
      process.execPath,
      ['node_modules/wrangler/bin/wrangler.js', ...args],
      { stdio: 'inherit', env },
    );
    child.on('error', reject);
    child.on('exit', (code) => done(code ?? 1));
  });
}
const migration = [
  'd1',
  'migrations',
  'apply',
  'DB',
  '--local',
  '--config',
  'wrangler.local.json',
];
if (mode === 'migrate') process.exit(await run(migration));
// Separate SQLite files prevent two local workerd processes contending for locks.
const persist = resolve('.wrangler/preview-state');
const migrated = await run([...migration, '--persist-to', persist]);
if (migrated) process.exit(migrated);
process.exit(
  await run([
    'dev',
    '--config',
    'dist/server/wrangler.json',
    '--persist-to',
    persist,
    ...process.argv.slice(3),
  ]),
);
