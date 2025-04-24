/**
 * Fix Gemini.ts Syntax Error
 * 
 * The file has a syntax error caused by our edit. Let's create a script
 * to properly fix it.
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function fixGeminiFile() {
  try {
    // Read the file
    const geminiPath = path.join(__dirname, 'server', 'gemini.ts');
    let content = fs.readFileSync(geminiPath, 'utf8');
    
    // Fix the variable declaration and try block issue
    content = content.replace(
      /export async function processTextFile\([^)]+\): Promise<any\[\]> \{\s+\/\/ Set higher memory limit[^}]+try \{[\s\S]+?try \{/m,
      `export async function processTextFile(filePath: string, projectName: string, fileName: string, contentType: string = 'general', minRequirements: number = 5, inputDataId?: number): Promise<any[]> {
  // Set higher memory limit for Node.js when processing large text files
  const originalNodeOptions = process.env.NODE_OPTIONS;
  
  // Increase memory limit temporarily for this operation
  process.env.NODE_OPTIONS = "--max-old-space-size=4096";
  
  try {`
    );
    
    // Write the fixed content back
    fs.writeFileSync(geminiPath, content, 'utf8');
    console.log('Successfully fixed gemini.ts syntax issues');
  } catch (error) {
    console.error('Error fixing gemini.ts:', error);
  }
}

fixGeminiFile().catch(console.error);