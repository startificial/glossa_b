import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const filePath = path.join(__dirname, 'server/gemini.ts');
const content = fs.readFileSync(filePath, 'utf8');

// Replace the perspective.focus call with a safer version
const saferCode = content.replace(
  /focusing specifically on \${perspective\.focus}\./,
  `focusing specifically on \${perspective && perspective.focus ? perspective.focus : 'system requirements'}.`
);

fs.writeFileSync(filePath, saferCode, 'utf8');
console.log('Updated gemini.ts prompt with safer perspective.focus handling');
