import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const filePath = path.join(__dirname, 'server/gemini.ts');
const content = fs.readFileSync(filePath, 'utf8');

// Replace the file extension check with a safer version
const saferCode = content.replace(
  /} else if \(fileInfo\.name\.toLowerCase\(\)\.endsWith\('\.mp3'\) \|\| fileInfo\.name\.toLowerCase\(\)\.endsWith\('\.wav'\) \|\| fileInfo\.name\.toLowerCase\(\)\.endsWith\('\.m4a'\)\) {/,
  `} else if (fileInfo && fileInfo.name && typeof fileInfo.name === 'string' && 
        (fileInfo.name.toLowerCase().endsWith('.mp3') || 
         fileInfo.name.toLowerCase().endsWith('.wav') || 
         fileInfo.name.toLowerCase().endsWith('.m4a'))) {`
);

fs.writeFileSync(filePath, saferCode, 'utf8');
console.log('Updated gemini.ts with safer file extension checking');
