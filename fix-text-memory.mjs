/**
 * Fix for JavaScript heap memory issue when processing text files.
 * 
 * This script rewrites the processTextFile function to use a streaming approach
 * for processing large text files.
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const newFunction = `export async function processTextFile(filePath: string, projectName: string, fileName: string, contentType: string = 'general', minRequirements: number = 5, inputDataId?: number): Promise<any[]> {
  // Set higher memory limit for Node.js when processing large text files
  const originalNodeOptions = process.env.NODE_OPTIONS;
  
  try {
    // Increase memory limit temporarily for this operation
    process.env.NODE_OPTIONS = "--max-old-space-size=4096";
    
    // Check file size first to determine approach
    const stats = fs.statSync(filePath);
    const fileSizeMB = stats.size / (1024 * 1024);
    console.log(\`Processing text file: \${fileName} (\${fileSizeMB.toFixed(2)} MB)\`);

    let chunks: string[] = [];
    
    // For all files, use a streaming approach with optimized parameters based on file size
    // This prevents memory issues with large files
    const maxChunks = fileSizeMB < 1 ? 1 : 
                      fileSizeMB < 3 ? 2 : 
                      fileSizeMB < 10 ? 4 : 5;
                      
    console.log(\`Using streaming approach with max \${maxChunks} chunks for memory efficiency.\`);
    
    // Determine an appropriate chunk size based on file size
    // For small files, use a larger percentage of the file for better context
    // For large files, use smaller chunks to avoid memory issues
    const chunkSizeBytes = Math.min(
      Math.ceil(stats.size / maxChunks),
      2 * 1024 * 1024 // Max 2MB per chunk to prevent memory issues
    );
    
    const buffer = Buffer.alloc(chunkSizeBytes);
    const fd = fs.openSync(filePath, 'r');
    
    try {
      let bytesRead = 0;
      let position = 0;
      
      // Read evenly spaced chunks from the file
      for (let i = 0; i < maxChunks; i++) {
        // For small files (< 1MB), just read the entire file once
        if (fileSizeMB < 1 && i > 0) break;
        
        // Calculate position to read from - evenly space throughout the file
        position = i * Math.floor(stats.size / maxChunks);
        
        // Skip if we're past the end of file
        if (position >= stats.size) break;
        
        // Read a chunk
        bytesRead = fs.readSync(fd, buffer, 0, chunkSizeBytes, position);
        
        if (bytesRead > 0) {
          const chunkContent = buffer.slice(0, bytesRead).toString('utf8');
          
          // Clean up chunk boundaries to avoid cutting in the middle of words
          let cleanedChunk = chunkContent;
          
          // Find sentence boundaries for cleaner chunks
          if (i > 0) {
            // For all chunks except first, trim beginning to a sentence start
            const sentenceStart = cleanedChunk.match(/[.!?]\\s+[A-Z]/);
            if (sentenceStart && sentenceStart.index && sentenceStart.index < 1000) {
              cleanedChunk = cleanedChunk.substring(sentenceStart.index + 2);
            }
          }
          
          if (i < maxChunks - 1 && position + bytesRead < stats.size) {
            // For all chunks except last, trim end to a sentence end
            const reversedChunk = cleanedChunk.split('').reverse().join('');
            const sentenceEnd = reversedChunk.match(/[A-Z]\\s+[.!?]/);
            if (sentenceEnd && sentenceEnd.index && sentenceEnd.index < 1000) {
              cleanedChunk = cleanedChunk.substring(0, cleanedChunk.length - (sentenceEnd.index + 2));
            }
          }
          
          chunks.push(cleanedChunk);
        }
      }
    } finally {
      fs.closeSync(fd);
    }
    
    console.log(\`Read \${chunks.length} representative chunks for processing\`);
    
    // Initialize an array to store all requirements
    let allRequirements: any[] = [];
    
    // Process each chunk
    for (let i = 0; i < chunks.length; i++) {
      console.log(\`Processing chunk \${i+1}/\${chunks.length}\`);
      
      // Get the Gemini model
      const model = genAI.getGenerativeModel({
        model: "gemini-1.5-pro",
        generationConfig,
        safetySettings,
      });

      // Prepare content type specific instructions based on content type
      let contentTypeInstructions = '';
      if (contentType === 'workflow') {
        contentTypeInstructions = \`Since the content type is workflow, the content describes business workflows that should be migrated from the source system to the target system. Focus on identifying the key user flows, business processes, data transformations, and integration points that need to be considered.\`;
      } else if (contentType === 'user_feedback') {
        contentTypeInstructions = \`Since the content type is user feedback, the content describes existing users' opinions about the legacy system. Focus on identifying the users' pain points and requested improvements so that the experience in the new system is an improvement.\`;
      } else if (contentType === 'documentation' || contentType === 'specifications') {
        contentTypeInstructions = \`Since the content type is documentation or specifications, the content describes technical or business systems in the legacy system. Use this to identify data structures, business logic, and system behaviors in the legacy system, which may need to be recreated in the new system.\`;
      } else {
        contentTypeInstructions = \`Please analyze this general content and extract requirements based on the text.\`;
      }
      
      // Prepare chunking instructions
      const chunkingInstructions = chunks.length > 1 ? 
        'Only extract requirements that appear in this specific chunk. Do not manufacture requirements based on guessing what might be in other chunks.' : 
        '';
      
      // Create a prompt for requirement extraction using our centralized prompt
      const prompt = GEMINI_REQUIREMENTS_PROMPT
        .replace('{projectName}', projectName)
        .replace('{fileName}', fileName)
        .replace('{contentType}', contentType)
        .replace('{chunkIndex}', (i+1).toString())
        .replace('{totalChunks}', chunks.length.toString())
        .replace('{contentTypeInstructions}', contentTypeInstructions)
        .replace('{chunkingInstructions}', chunkingInstructions)
        .replace('{chunkContent}', chunks[i])
        .replace('{minRequirements}', minRequirements.toString());

      try {
        // Generate content
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        
        // Parse the JSON response
        try {
          // Extract just the JSON part from the response
          const jsonMatch = text.match(/\\[[\\s\\S]*\\]/);
          if (jsonMatch) {
            const jsonText = jsonMatch[0];
            const chunkRequirements = JSON.parse(jsonText);
            allRequirements = [...allRequirements, ...chunkRequirements];
          } else {
            // If no JSON array was found, try parsing the whole response
            const chunkRequirements = JSON.parse(text);
            allRequirements = [...allRequirements, ...chunkRequirements];
          }
        } catch (parseError) {
          console.error(\`Error parsing Gemini response for chunk \${i+1}:\`, parseError);
          console.error("Raw response:", text);
          // Continue with other chunks even if one fails
        }
      } catch (chunkError) {
        console.error(\`Error processing chunk \${i+1}:\`, chunkError);
        // Continue with other chunks even if one fails
      }
      
      // Small pause between chunk processing to avoid rate limiting
      if (i < chunks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    // Remove any duplicate requirements (comparing by title or description)
    const uniqueRequirements = allRequirements.filter((req, index, self) => {
      // Handle both new format (title/description) and legacy format (text)
      const reqText = req.description || req.text;
      return index === self.findIndex((r) => {
        const rText = r.description || r.text;
        return reqText === rText;
      });
    });
    
    console.log(\`Extracted \${uniqueRequirements.length} unique requirements from \${chunks.length} chunks\`);
    
    // If inputDataId is provided, find text references for each requirement
    if (inputDataId) {
      console.log('Finding text references for requirements...');
      
      // Process each requirement to find relevant text references
      const requirementsWithReferences = await Promise.all(
        uniqueRequirements.map(async (req) => {
          try {
            // Get the requirement text, handling both new format (description) and legacy format (text)
            const requirementText = req.description || req.text;
            
            // Make sure we have text to process
            if (!requirementText) {
              console.warn(\`Skipping text references for requirement with missing text: \${JSON.stringify(req)}\`);
              return req;
            }
            
            // Find relevant text passages for this requirement
            const textReferences = await processTextFileForRequirement(
              filePath,
              requirementText,
              inputDataId
            );
            
            // Add the text references to the requirement if any were found
            return {
              ...req,
              textReferences: textReferences.length > 0 ? textReferences : undefined
            };
          } catch (error) {
            console.error(\`Error finding text references for requirement: \${req.text?.substring(0, 50) || 'unknown'}...\`, error);
            return req; // Return the original requirement without references
          }
        })
      );
      
      console.log(\`Found text references for \${requirementsWithReferences.filter(r => r.textReferences).length} requirements\`);
      return requirementsWithReferences;
    }
    
    return uniqueRequirements;
  } catch (error) {
    console.error("Error processing file with Gemini:", error);
    throw error;
  } finally {
    // Restore original NODE_OPTIONS
    if (originalNodeOptions) {
      process.env.NODE_OPTIONS = originalNodeOptions;
    } else {
      delete process.env.NODE_OPTIONS;
    }
  }
}`;

async function fixTextMemoryIssue() {
  try {
    const geminiPath = path.join(__dirname, 'server', 'gemini.ts');
    
    // Read the file
    let content = fs.readFileSync(geminiPath, 'utf8');
    
    // Find the start of the processTextFile function
    const functionStart = content.indexOf('export async function processTextFile');
    if (functionStart === -1) {
      console.error("Could not find processTextFile function in gemini.ts");
      return;
    }
    
    // Find the end of the function (next export function after processTextFile)
    const nextFunctionStart = content.indexOf('export async function', functionStart + 10);
    if (nextFunctionStart === -1) {
      console.error("Could not find the end of processTextFile function");
      return;
    }
    
    // Replace the function
    const newContent = content.substring(0, functionStart) + 
                     newFunction + 
                     content.substring(nextFunctionStart);
    
    // Write the new content
    fs.writeFileSync(geminiPath, newContent, 'utf8');
    
    console.log("Successfully replaced processTextFile function with memory-efficient version");
  } catch (error) {
    console.error("Error fixing text memory issue:", error);
  }
}

fixTextMemoryIssue().catch(console.error);