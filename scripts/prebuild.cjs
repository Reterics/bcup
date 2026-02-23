const { cpSync, existsSync, rmSync } = require('fs');
const { resolve } = require('path');

const root = resolve(__dirname, '..');
const distBackups = resolve(root, 'dist', 'api', 'v1', 'backups');
const backupsTmp = resolve(root, '.backups-tmp');

// Save existing backups before vite cleans dist/
if (existsSync(distBackups)) {
  rmSync(backupsTmp, { recursive: true, force: true });
  cpSync(distBackups, backupsTmp, { recursive: true });
  console.log('Backups saved from dist/api/v1/backups');
} else {
  console.log('No existing backups to preserve');
}
