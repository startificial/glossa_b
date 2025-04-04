import fs from 'fs';

// Read the file
const filePath = 'server/gemini.ts';
let fileContent = fs.readFileSync(filePath, 'utf8');

// Define the patterns to replace
const oldPattern = `    // Remove any duplicate requirements (comparing by text)
    const uniqueRequirements = allRequirements.filter((req, index, self) =>
      index === self.findIndex((r) => r.text === req.text)
    );`;

const newPattern = `    // Remove any duplicate requirements (comparing by title or description)
    const uniqueRequirements = allRequirements.filter((req, index, self) => {
      // Handle both new format (title/description) and legacy format (text)
      const reqText = req.description || req.text;
      return index === self.findIndex((r) => {
        const rText = r.description || r.text;
        return reqText === rText;
      });
    });`;

// Replace all occurrences
const newContent = fileContent.replaceAll(oldPattern, newPattern);

// Write the file back
fs.writeFileSync(filePath, newContent, 'utf8');

console.log('Replacement completed.');