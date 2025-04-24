import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const filePath = path.join(__dirname, 'server/gemini.ts');
const content = fs.readFileSync(filePath, 'utf8');

// Replace the perspective.name.toLowerCase() call with a safer version
const saferCode = content.replace(
  /You are a business systems analyst specializing in \${inferredDomain} systems with expertise in \${perspective\.name\.toLowerCase\(\)}\./,
  `You are a business systems analyst specializing in \${inferredDomain} systems with expertise in \${perspective && perspective.name && typeof perspective.name === 'string' ? perspective.name.toLowerCase() : 'functional requirements'}.`
);

fs.writeFileSync(filePath, saferCode, 'utf8');
console.log('Updated gemini.ts prompt with safer toLowerCase() handling');
