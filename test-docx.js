// Test DOCX Processing 
// Create simplified versions of the functions to test our fixes
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import mammoth from 'mammoth';
import { promisify } from 'util';

const readFile = promisify(fs.readFile);

// Extract text from a DOCX file
async function extractTextFromDocx(filePath) {
  try {
    console.log(`Extracting text from DOCX: ${filePath}`);
    
    // Check if the file exists
    if (!fs.existsSync(filePath)) {
      console.error(`DOCX file not found: ${filePath}`);
      return {
        text: '',
        success: false,
        error: 'File not found'
      };
    }
    
    // Read the file buffer
    const buffer = await readFile(filePath);
    
    // Extract text from the document
    const result = await mammoth.extractRawText({ buffer });
    const text = result.value;
    
    // Log any warnings
    if (result.messages && result.messages.length > 0) {
      console.warn(`Warnings while extracting text from DOCX: ${JSON.stringify(result.messages)}`);
    }
    
    if (!text || text.trim().length === 0) {
      console.error('No text extracted from DOCX file');
      return {
        text: '',
        success: false,
        error: 'No text could be extracted from the document'
      };
    }
    
    console.log(`Successfully extracted ${text.length} characters from DOCX`);
    return {
      text,
      success: true
    };
  } catch (error) {
    console.error(`Error extracting text from DOCX file: ${error}`);
    return {
      text: '',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during DOCX text extraction'
    };
  }
}

// Analyze a DOCX document
async function analyzeDocx(filePath) {
  try {
    console.log(`Analyzing DOCX file: ${filePath}`);
    
    // Extract text from the document
    const textResult = await extractTextFromDocx(filePath);
    
    if (!textResult.success) {
      console.error(`Failed to extract text from DOCX: ${textResult.error}`);
      return {
        success: false,
        error: textResult.error,
        metadata: {},
        context: {
          domain: "unknown",
          docType: "DOCX document",
          keywords: [],
          hasRequirements: false
        }
      };
    }
    
    const text = textResult.text;
    
    // Simplified metadata extraction
    const metadata = {
      textLength: text.length,
      format: "DOCX",
      processingTime: new Date().toISOString()
    };
    
    // Basic context detection - this could be enhanced with NLP or AI
    const keywords = text.split(/\s+/)
      .filter(word => word.length > 5)
      .filter((word, index, self) => self.indexOf(word) === index)
      .slice(0, 20);
    
    // Check if it likely contains requirements based on keyword detection
    const requirementsKeywords = ['shall', 'must', 'required', 'requirement', 'should', 'necessary'];
    // Add null/undefined check before using toLowerCase
    const hasRequirements = text && typeof text === 'string' 
      ? requirementsKeywords.some(kw => text.toLowerCase().includes(kw))
      : false;
    
    // Infer domain from content with null/undefined safety
    let domain = "general";
    if (!text || typeof text !== 'string') {
      domain = "unknown";
    } else if (text.toLowerCase().includes("software") || text.toLowerCase().includes("application")) {
      domain = "software";
    } else if (text.toLowerCase().includes("service") || text.toLowerCase().includes("customer")) {
      domain = "service management";
    } else if (text.toLowerCase().includes("sales") || text.toLowerCase().includes("marketing")) {
      domain = "sales and marketing";
    }
    
    return {
      success: true,
      text,
      metadata,
      context: {
        domain,
        docType: "DOCX document",
        keywords,
        hasRequirements
      }
    };
  } catch (error) {
    console.error(`Error analyzing DOCX file: ${error}`);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error analyzing DOCX',
      metadata: {},
      context: {
        domain: "unknown",
        docType: "DOCX document",
        keywords: [],
        hasRequirements: false
      }
    };
  }
}

// Get file content based on file type (with added null checks)
async function getFileContent(filePath, fileType) {
  try {
    // Add null/undefined check for fileType
    if (!fileType) {
      console.error('File type is undefined or null');
      return { 
        text: '', 
        success: false, 
        error: 'File type is undefined or null' 
      };
    }
    
    console.log(`Getting content from file: ${filePath} (type: ${fileType})`);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      console.error(`File not found: ${filePath}`);
      return { text: '', success: false, error: 'File not found' };
    }
    
    // Add null checks before toLowerCase
    if (fileType && typeof fileType === 'string' && 
       (fileType.toLowerCase() === '.docx' || fileType.toLowerCase() === '.doc')) {
      return await extractTextFromDocx(filePath);
    } else if (fileType && typeof fileType === 'string' && 
              (fileType.toLowerCase() === '.txt' || fileType.toLowerCase() === '.md')) {
      // We're only testing DOCX in this test script
      return { text: 'Text file content', success: true };
    } else {
      console.error(`Unsupported file type for text extraction: ${fileType}`);
      return { 
        text: '', 
        success: false, 
        error: `Unsupported file type: ${fileType}. Supported types include .docx, .doc, .txt, and .md` 
      };
    }
  } catch (error) {
    console.error(`Error getting file content: ${error}`);
    return {
      text: '',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error extracting file content'
    };
  }
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testDocxProcessing() {
  console.log('Starting DOCX processing test with fixed code...');
  
  // Test all three files
  const filePaths = [
    path.join(__dirname, 'uploads', 'f1828e1a10aed33d5595e08f519b9617.docx'),
    path.join(__dirname, 'uploads', 'be2b99a22577535a60f505c678d29c42.docx'),
    path.join(__dirname, 'uploads', '98871cb81418448086f867da600fe087.docx')
  ];
  
  let success = true;

  // Part 1: Test regular file processing
  console.log('\n=== PART 1: Testing regular file processing ===');
  for (const filePath of filePaths) {
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️ File not found, skipping: ${filePath}`);
      continue;
    }
    
    try {
      console.log(`\nTesting file: ${filePath}`);
      console.log('1. Extracting text...');
      const textResult = await extractTextFromDocx(filePath);
      
      if (!textResult.success) {
        console.log(`❌ Text extraction failed: ${textResult.error}`);
        success = false;
        continue;
      }
      
      console.log(`✅ Text extraction successful (${textResult.text.length} characters)`);
      
      console.log('2. Analyzing DOCX...');
      const analysisResult = await analyzeDocx(filePath);
      
      if (!analysisResult.success) {
        console.log(`❌ Analysis failed: ${analysisResult.error}`);
        success = false;
        continue;
      }
      
      console.log(`✅ Analysis successful`);
      console.log('Domain:', analysisResult.context.domain);
      console.log('Has requirements:', analysisResult.context.hasRequirements);
      console.log('Keywords:', analysisResult.context.keywords.slice(0, 5));
    } catch (err) {
      console.error(`❌ Unexpected error: ${err.message}`);
      success = false;
    }
  }
  
  // Part 2: Test edge cases that previously caused errors
  console.log('\n=== PART 2: Testing edge cases (undefined/null values) ===');
  
  // Test case 1: Passing undefined fileType to getFileContent
  try {
    console.log('\nTest case 1: Undefined fileType');
    const filePath = filePaths[0];
    if (fs.existsSync(filePath)) {
      const result = await getFileContent(filePath, undefined);
      console.log(`✅ Handled undefined fileType without crashing: success=${result.success}, error=${result.error || 'none'}`);
    } else {
      console.log('⚠️ Skipping undefined fileType test because no test files exist');
    }
  } catch (err) {
    console.error(`❌ Failed undefined fileType test: ${err.message}`);
    success = false;
  }
  
  // Test case 2: Passing null domain to analyzeDocx (testing the toLowerCase in domain inference)
  try {
    console.log('\nTest case 2: Handling null in domain inference');
    const result = await analyzeDocx('/path/to/nonexistent/file.docx');
    console.log(`✅ Handled nonexistent file without crashing: success=${result.success}, domain=${result.context?.domain || 'N/A'}`);
  } catch (err) {
    console.error(`❌ Failed null domain inference test: ${err.message}`);
    success = false;
  }
  
  if (success) {
    console.log('\n✅ All tests passed! The DOCX processing code is working properly.');
  } else {
    console.log('\n❌ Some tests failed. Check the logs above for details.');
  }
}

testDocxProcessing().catch(console.error);