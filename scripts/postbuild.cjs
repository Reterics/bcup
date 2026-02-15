const { cpSync } = require('fs');
const { resolve } = require('path');

const root = resolve(__dirname, '..');

cpSync(
  resolve(root, 'api'),
  resolve(root, 'dist', 'api'),
  {
    recursive: true,
    filter: (src) => !src.includes('firebase-adminsdk')
  }
);

console.log('API folder copied to dist/api');
