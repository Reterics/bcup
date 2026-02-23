const { cpSync, existsSync, rmSync } = require('fs');
const { resolve } = require('path');

const root = resolve(__dirname, '..');
const backupsTmp = resolve(root, '.backups-tmp');
const distBackups = resolve(root, 'dist', 'api', 'v1', 'backups');

// Copy API folder to dist
cpSync(
  resolve(root, 'api'),
  resolve(root, 'dist', 'api'),
  {
    recursive: true,
    filter: (src) => !src.includes('firebase-adminsdk')
  }
);

console.log('API folder copied to dist/api');

// Restore saved backups from prebuild
if (existsSync(backupsTmp)) {
  cpSync(backupsTmp, distBackups, { recursive: true });
  rmSync(backupsTmp, { recursive: true, force: true });
  console.log('Backups restored to dist/api/v1/backups');
}
