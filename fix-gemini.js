const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'server/gemini.ts');
const content = fs.readFileSync(filePath, 'utf8');

// Replace the domain keyword filtering code with safer version
const saferCode = content.replace(
  /\/\/ Check if any domain keywords are in the filename or project name\s+const matchedKeywords = domainsList\.filter\(domain => \s+fileName\.toLowerCase\(\)\.includes\(domain\.toLowerCase\(\)\) \|\| \s+projectName\.toLowerCase\(\)\.includes\(domain\.toLowerCase\(\)\)\s+\);/gs,
  `// Check if any domain keywords are in the filename or project name
    // With null/undefined safety checks
    const matchedKeywords = domainsList.filter(domain => {
      if (!domain) return false;
      
      const fileNameMatch = fileName && typeof fileName === 'string' ? 
        fileName.toLowerCase().includes(domain.toLowerCase()) : false;
        
      const projectNameMatch = projectName && typeof projectName === 'string' ? 
        projectName.toLowerCase().includes(domain.toLowerCase()) : false;
        
      return fileNameMatch || projectNameMatch;
    });`
);

fs.writeFileSync(filePath, saferCode, 'utf8');
console.log('Updated gemini.ts with safer toLowerCase() handling');
