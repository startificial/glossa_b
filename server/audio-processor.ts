/**
 * Audio processor module for extracting audio timestamps for requirements.
 * This allows tying requirements back to specific segments in audio files.
 */
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import ffmpeg from 'fluent-ffmpeg';
import os from 'os';

/**
 * AudioTimestamp type definition
 */
export interface AudioTimestamp {
  id: string;
  inputDataId: number;
  startTime: number;
  endTime: number;
  transcript?: string;
  audioClipPath?: string;
  relevance?: number;
}

/**
 * Calculate relevance between an audio transcript and a requirement
 * @param transcript The transcript text
 * @param requirement The requirement text
 * @returns A score between 0 and 1 representing the relevance
 */
function calculateAudioRelevance(transcript: string | undefined | null, requirement: string | undefined | null): number {
  // Handle undefined or null inputs
  if (!transcript || !requirement) {
    console.log('Missing input for audio relevance calculation:', 
      !transcript ? 'transcript is empty' : 'requirement text is empty');
    return 0;
  }

  // Declare variables outside of try-catch with default empty values
  let requirementWords: Set<string> = new Set();
  let transcriptWords: string[] = [];
  
  // Simple word matching algorithm (in a real implementation, use more sophisticated NLP)
  try {
    requirementWords = new Set(
      requirement.toLowerCase()
        .replace(/[^\w\s]/g, '')
        .split(/\s+/)
        .filter(word => word.length > 3) // Only consider words longer than 3 chars
    );
    
    transcriptWords = transcript.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3);
    
    if (requirementWords.size === 0 || transcriptWords.length === 0) {
      return 0;
    }
  } catch (error) {
    console.error('Error processing text for relevance calculation:', error);
    return 0;
  }
  
  // Count matches
  let matches = 0;
  for (const word of transcriptWords) {
    if (requirementWords.has(word)) {
      matches++;
    }
  }
  
  // Calculate relevance score (ensure denominator is not zero)
  const denominator = Math.min(transcriptWords.length, requirementWords.size);
  if (denominator === 0) {
    return 0;
  }
  
  const relevance = matches / denominator;
  return Math.min(1, relevance * 1.5); // Scale a bit
}

/**
 * AudioProcessor class for handling audio file processing
 */
export class AudioProcessor {
  private _inputPath: string;
  private _outputDir: string;
  private _inputDataId: number;
  
  /**
   * Create an AudioProcessor instance
   * @param filePath Path to the audio file
   * @param outputDir Directory to store output files (clips, etc.)
   * @param inputDataId The input data ID
   */
  constructor(filePath: string, outputDir: string, inputDataId: number) {
    this._inputPath = filePath;
    this._outputDir = outputDir;
    this._inputDataId = inputDataId;
    
    // Create output directory if it doesn't exist
    try {
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
        console.log(`Created output directory for audio processing: ${outputDir}`);
      }
    } catch (dirError) {
      console.error(`Failed to create output directory for audio processing ${outputDir}:`, dirError);
      throw dirError;
    }
  }
  
  /**
   * Get metadata for the audio file
   * @returns Promise resolving to the audio metadata
   */
  async getMetadata(): Promise<any> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(this._inputPath, (err, metadata) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(metadata);
      });
    });
  }
  
  /**
   * Segment the audio file into chunks
   * @param segmentDuration Duration of each segment in seconds
   * @returns Promise resolving to an array of audio segments
   */
  async segmentAudio(segmentDuration: number = 30): Promise<AudioTimestamp[]> {
    try {
      // Get audio metadata
      const metadata = await this.getMetadata();
      const audioDuration = metadata.format.duration;
      
      if (!audioDuration) {
        throw new Error('Could not determine audio duration');
      }
      
      // Calculate number of segments
      const numSegments = Math.ceil(audioDuration / segmentDuration);
      console.log(`Segmenting audio file (${audioDuration}s) into ${numSegments} segments of ${segmentDuration}s each`);
      
      // Create audio timestamps (without transcripts yet)
      const segments: AudioTimestamp[] = [];
      
      for (let i = 0; i < numSegments; i++) {
        const startTime = i * segmentDuration;
        const endTime = Math.min((i + 1) * segmentDuration, audioDuration);
        
        segments.push({
          id: uuidv4(),
          inputDataId: this._inputDataId,
          startTime,
          endTime
        });
      }
      
      return segments;
    } catch (error) {
      console.error('Error segmenting audio:', error);
      return [];
    }
  }
  
  /**
   * Extract an audio clip for a specific timestamp
   * @param timestamp The AudioTimestamp to extract a clip for
   * @returns Promise resolving to the path of the extracted clip
   */
  async extractClip(timestamp: AudioTimestamp): Promise<string> {
    // Ensure output directory exists
    try {
      if (!fs.existsSync(this._outputDir)) {
        fs.mkdirSync(this._outputDir, { recursive: true });
        console.log(`Created output directory for audio clips: ${this._outputDir}`);
      }
    } catch (dirError) {
      console.error(`Failed to create output directory for audio clips ${this._outputDir}:`, dirError);
      throw dirError;
    }
    
    const outputFilename = `clip_${timestamp.id}.mp3`;
    const outputPath = path.join(this._outputDir, outputFilename);
    
    return new Promise((resolve, reject) => {
      ffmpeg(this._inputPath)
        .setStartTime(timestamp.startTime)
        .setDuration(timestamp.endTime - timestamp.startTime)
        .output(outputPath)
        .on('end', () => {
          // Verify the clip was created
          if (fs.existsSync(outputPath)) {
            // Create a web-accessible URL path instead of file system path
            const webPath = `/media/audio-timestamps/${this._inputDataId}/${outputFilename}`;
            resolve(webPath);
          } else {
            reject(new Error(`Audio clip was not created at ${outputPath}`));
          }
        })
        .on('error', (err) => reject(err))
        .run();
    });
  }
  
  /**
   * Process an audio segment with a mock transcript
   * (In a real implementation, this would use a speech-to-text service)
   * @param timestamp The AudioTimestamp to process
   * @returns The updated AudioTimestamp with transcript and clip
   */
  async processSegment(timestamp: AudioTimestamp): Promise<AudioTimestamp> {
    try {
      // Extract clip
      const clipPath = await this.extractClip(timestamp);
      
      // In a real implementation, perform speech-to-text here
      // Mock transcript based on segment position
      const transcripts = [
        "This shows the customer service workflow for handling incoming support requests.",
        "The agent needs to categorize the case based on the customer's description.",
        "After categorization, the system will recommend knowledge articles to help resolve the issue.",
        "If the issue cannot be resolved using knowledge articles, the agent can escalate to a supervisor.",
        "The case management system needs to track all interactions and time spent on each case.",
        "Supervisors need to be able to reassign cases to different agents based on expertise.",
        "The reporting dashboard should show agent performance metrics and case resolution times.",
        "Customer satisfaction scores need to be collected at the end of each support interaction."
      ];
      
      // Use segment index to select a mock transcript
      const index = Math.floor(timestamp.startTime / 30) % transcripts.length;
      const transcript = transcripts[index];
      
      return {
        ...timestamp,
        transcript,
        audioClipPath: clipPath
      };
    } catch (error) {
      console.error(`Error processing audio segment ${timestamp.id}:`, error);
      return timestamp;
    }
  }
  
  /**
   * Find matching audio segments for a requirement
   * @param segments Array of AudioTimestamp objects
   * @param requirementText The requirement text to match
   * @returns Promise resolving to an array of matching AudioTimestamp objects
   */
  async findMatchingSegments(
    segments: AudioTimestamp[],
    requirementText: string
  ): Promise<AudioTimestamp[]> {
    try {
      const processedSegments: AudioTimestamp[] = [];
      
      // Process segments to get transcripts
      for (const segment of segments) {
        if (!segment.transcript) {
          const processed = await this.processSegment(segment);
          processedSegments.push(processed);
        } else {
          processedSegments.push(segment);
        }
      }
      
      // Calculate relevance for each segment
      const segmentsWithRelevance = processedSegments.map(segment => {
        if (segment.transcript) {
          const relevance = calculateAudioRelevance(segment.transcript, requirementText);
          return {
            ...segment,
            relevance
          };
        }
        return segment;
      });
      
      // Filter to keep only segments with sufficient relevance
      const matchingSegments = segmentsWithRelevance
        .filter(segment => segment.relevance !== undefined && segment.relevance > 0.3)
        .sort((a, b) => (b.relevance || 0) - (a.relevance || 0)); // Sort by relevance (highest first)
      
      return matchingSegments;
    } catch (error) {
      console.error('Error finding matching segments:', error);
      return [];
    }
  }
  
  /**
   * Process an audio file to find timestamps relevant to a requirement
   * @param requirementText The requirement text to find timestamps for
   * @returns Promise resolving to an array of AudioTimestamp objects
   */
  async processAudioForRequirement(requirementText: string): Promise<AudioTimestamp[]> {
    try {
      // Segment the audio file
      const segments = await this.segmentAudio();
      
      // Find matching segments
      const matchingSegments = await this.findMatchingSegments(segments, requirementText);
      
      return matchingSegments;
    } catch (error) {
      console.error('Error processing audio for requirement:', error);
      return [];
    }
  }
}

/**
 * Process an audio file to find timestamps for a requirement
 * @param filePath Path to the audio file
 * @param requirement The requirement text to find timestamps for
 * @param inputDataId The ID of the input data
 * @returns Promise resolving to an array of AudioTimestamp objects
 */
export async function processAudioFileForRequirement(
  filePath: string,
  requirement: string,
  inputDataId: number
): Promise<AudioTimestamp[]> {
  try {
    // Validate inputs
    if (!filePath) {
      throw new Error('Missing audio file path');
    }
    
    if (!requirement) {
      throw new Error('Missing requirement text');
    }
    
    if (!fs.existsSync(filePath)) {
      throw new Error(`Audio file not found at path: ${filePath}`);
    }
    
    // Create output directory with nested path
    const outputDir = path.join(os.tmpdir(), 'audio-timestamps', inputDataId.toString());
    try {
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
        console.log(`Created parent output directory: ${outputDir}`);
      }
    } catch (dirError) {
      console.error(`Failed to create output directory ${outputDir}:`, dirError);
      throw dirError;
    }
    
    // Create processor
    const processor = new AudioProcessor(filePath, outputDir, inputDataId);
    
    // Process audio for requirement
    return await processor.processAudioForRequirement(requirement);
  } catch (error) {
    console.error('Error processing audio file for requirement:', error);
    return [];
  }
}