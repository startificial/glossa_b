import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { exec } from 'child_process';
import ffmpeg from 'fluent-ffmpeg';
import crypto from 'crypto';
import { SpeechClient } from '@google-cloud/speech';
import { setupGoogleCredentials, hasGoogleCredentials } from './google-credentials';

export interface VideoScene {
  id: string;
  inputDataId: number;
  startTime: number;
  endTime: number;
  thumbnailPath?: string;
  clipPath?: string;
  relevance?: number;
  label?: string;
}

const execPromise = promisify(exec);

export class VideoProcessor {
  private _inputPath: string;
  private _outputDir: string;
  private _inputDataId: number;
  private _metadataCache: any = null;
  
  // Create a single SpeechClient instance for the entire class
  private _speechClient: SpeechClient;

  constructor(inputPath: string, outputDir: string, inputDataId: number) {
    this._inputPath = inputPath;
    this._outputDir = outputDir;
    this._inputDataId = inputDataId;

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Initialize Google Cloud Speech client using environment credentials
    try {
      if (hasGoogleCredentials()) {
        console.log('Initializing Google Cloud Speech client with credentials');
        this._speechClient = new SpeechClient();
        console.log('Successfully initialized Google Cloud Speech client');
      } else {
        console.warn('Google Cloud Speech credentials not found. Transcription will not be available.');
        this._speechClient = null as any;
      }
    } catch (error) {
      console.error('Failed to initialize Google Cloud Speech client:', error);
      this._speechClient = null as any;
    }
  }
  
  /**
   * Setup credentials for Google Cloud services
   * Call this before using any Google Cloud services
   */
  static async setupCredentials(): Promise<void> {
    await setupGoogleCredentials();
  }

  /**
   * Get video metadata including duration, dimensions, fps, etc.
   */
  async getMetadata(): Promise<any> {
    if (this._metadataCache) {
      return this._metadataCache;
    }

    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(this._inputPath, (err, metadata) => {
        if (err) {
          reject(err);
          return;
        }
        
        this._metadataCache = metadata;
        resolve(metadata);
      });
    });
  }

  /**
   * Detect video scene changes using ffmpeg
   */
  async detectScenes(
    threshold: number = 0.4,
    minSceneDuration: number = 3
  ): Promise<VideoScene[]> {
    try {
      // Ensure output directory exists
      try {
        if (!fs.existsSync(this._outputDir)) {
          fs.mkdirSync(this._outputDir, { recursive: true });
          console.log(`Created output directory for scene detection: ${this._outputDir}`);
        }
      } catch (dirError) {
        console.error(`Failed to create output directory for scene detection ${this._outputDir}:`, dirError);
        throw dirError;
      }
      
      const metadata = await this.getMetadata();
      const videoDuration = metadata.format.duration;
      
      if (!videoDuration) {
        throw new Error('Could not determine video duration');
      }
      
      // Generate scene change data using ffmpeg
      const sceneDataPath = path.join(this._outputDir, 'scene_data.txt');
      
      await new Promise<void>((resolve, reject) => {
        ffmpeg(this._inputPath)
          .outputOptions([
            `-vf select='gt(scene,${threshold})',metadata=print:file=${sceneDataPath}`,
            '-f null',
          ])
          .output('/dev/null')
          .on('end', () => resolve())
          .on('error', (err) => reject(err))
          .run();
      });

      // Parse scene data file
      const sceneData = fs.readFileSync(sceneDataPath, 'utf-8');
      const sceneTimestamps = this.parseSceneData(sceneData);

      const scenes: VideoScene[] = [];
      
      // Always include the start of the video
      sceneTimestamps.unshift(0);
      
      // Convert timestamps to scene ranges
      for (let i = 0; i < sceneTimestamps.length - 1; i++) {
        const startTime = sceneTimestamps[i];
        const endTime = sceneTimestamps[i + 1];
        const duration = endTime - startTime;
        
        if (duration >= minSceneDuration) {
          scenes.push({
            id: crypto.randomUUID(),
            inputDataId: this._inputDataId,
            startTime,
            endTime,
            label: `Scene ${i + 1}`,
            relevance: 0.0
          });
        }
      }
      
      // Handle the last scene (to the end of the video)
      const lastStartTime = sceneTimestamps[sceneTimestamps.length - 1];
      if (videoDuration - lastStartTime >= minSceneDuration) {
        scenes.push({
          id: crypto.randomUUID(),
          inputDataId: this._inputDataId,
          startTime: lastStartTime,
          endTime: videoDuration,
          label: `Scene ${sceneTimestamps.length}`,
          relevance: 0.0
        });
      }

      fs.unlinkSync(sceneDataPath);
      return scenes;
    } catch (error) {
      console.error('Error detecting scenes:', error);
      throw error;
    }
  }

  /**
   * Parse ffmpeg scene detection output
   */
  private parseSceneData(sceneData: string): number[] {
    try {
      const timestamps: number[] = [];
      
      if (!sceneData) {
        console.warn('Empty scene data received, cannot parse timestamps');
        return timestamps;
      }
      
      const lines = sceneData.split('\n');
      
      for (const line of lines) {
        if (line.includes('pts_time:')) {
          const match = line.match(/pts_time:([\d.]+)/);
          if (match && match[1]) {
            const timestamp = parseFloat(match[1]);
            if (!isNaN(timestamp)) {
              timestamps.push(timestamp);
            }
          }
        }
      }
      
      if (timestamps.length === 0) {
        console.warn('No timestamps found in scene data');
      } else {
        console.log(`Parsed ${timestamps.length} scene change timestamps`);
      }
      
      return timestamps;
    } catch (error) {
      console.error('Error parsing scene data:', error);
      return [];
    }
  }

  /**
   * Generate a thumbnail for the scene
   */
  async generateThumbnail(scene: VideoScene): Promise<string> {
    // Ensure output directory exists
    try {
      if (!fs.existsSync(this._outputDir)) {
        fs.mkdirSync(this._outputDir, { recursive: true });
        console.log(`Created output directory for thumbnails: ${this._outputDir}`);
      }
    } catch (dirError) {
      console.error(`Failed to create output directory for thumbnails ${this._outputDir}:`, dirError);
      throw dirError;
    }
    
    const captureTime = scene.startTime + (scene.endTime - scene.startTime) / 3;
    const thumbnailFilename = `scene_${scene.id}_thumbnail.jpg`;
    const thumbnailPath = path.join(this._outputDir, thumbnailFilename);
    
    return new Promise<string>((resolve, reject) => {
      ffmpeg(this._inputPath)
        .screenshots({
          timestamps: [captureTime],
          filename: thumbnailFilename,
          folder: this._outputDir,
          size: '320x180'
        })
        .on('end', () => {
          // Verify the thumbnail was created
          if (fs.existsSync(thumbnailPath)) {
            const webPath = `/media/video-scenes/${thumbnailFilename}`;
            resolve(webPath);
          } else {
            reject(new Error(`Thumbnail was not created at ${thumbnailPath}`));
          }
        })
        .on('error', (err) => reject(err));
    });
  }

  /**
   * Extract a video clip for the scene
   */
  async extractClip(scene: VideoScene): Promise<string> {
    // Ensure output directory exists
    try {
      if (!fs.existsSync(this._outputDir)) {
        fs.mkdirSync(this._outputDir, { recursive: true });
        console.log(`Created output directory for clips: ${this._outputDir}`);
      }
    } catch (dirError) {
      console.error(`Failed to create output directory for clips ${this._outputDir}:`, dirError);
      throw dirError;
    }
    
    const clipFilename = `scene_${scene.id}_clip.mp4`;
    const clipPath = path.join(this._outputDir, clipFilename);
    const duration = scene.endTime - scene.startTime;
    
    return new Promise<string>((resolve, reject) => {
      ffmpeg(this._inputPath)
        .setStartTime(scene.startTime)
        .setDuration(duration)
        .output(clipPath)
        .outputOptions([
          '-c:v libx264',
          '-crf 23',
          '-preset veryfast',
          '-c:a aac',
          '-b:a 128k'
        ])
        .on('end', () => {
          // Verify the clip was created
          if (fs.existsSync(clipPath)) {
            const webPath = `/media/video-scenes/${clipFilename}`;
            resolve(webPath);
          } else {
            reject(new Error(`Clip was not created at ${clipPath}`));
          }
        })
        .on('error', (err) => reject(err))
        .run();
    });
  }

  /**
   * Extract audio (WAV) for the scene's time range,
   * then send it to Google Cloud Speech for transcription.
   */
  private async getSceneTranscript(scene: VideoScene): Promise<string> {
    // If Speech client is not available, return empty transcript
    if (!this._speechClient) {
      console.log(`Google Cloud Speech client not initialized. Scene ${scene.id} will use basic relevance.`);
      
      // Return the scene ID and timecodes as pseudo-transcript for testing
      return `Scene ${scene.id} from ${scene.startTime} to ${scene.endTime}`;
    }
    
    // Ensure output directory exists
    try {
      if (!fs.existsSync(this._outputDir)) {
        fs.mkdirSync(this._outputDir, { recursive: true });
        console.log(`Created output directory: ${this._outputDir}`);
      }
    } catch (dirError) {
      console.error(`Failed to create output directory ${this._outputDir}:`, dirError);
      return ''; // Return empty transcript if we can't create the directory
    }
    
    const audioFilename = `scene_${scene.id}_audio.wav`;
    const audioPath = path.join(this._outputDir, audioFilename);
    const duration = scene.endTime - scene.startTime;

    try {
      // 1) Extract the audio only for that time range
      await new Promise<void>((resolve, reject) => {
        ffmpeg(this._inputPath)
          .setStartTime(scene.startTime)
          .setDuration(duration)
          .noVideo()
          .audioCodec('pcm_s16le')   // 16-bit WAV
          .audioChannels(1)         // mono
          .audioFrequency(16000)    // 16 KHz is acceptable for speech-to-text
          .output(audioPath)
          .on('end', () => resolve())
          .on('error', (err) => reject(err))
          .run();
      });
      
      // Verify the audio file exists before reading it
      if (!fs.existsSync(audioPath)) {
        console.error(`Audio file was not created at ${audioPath}`);
        return '';
      }

      // 2) Transcribe the audio with Google Speech
      const audioBytes = fs.readFileSync(audioPath);
      
      // Log audio file size for debugging
      console.log(`Audio file size for scene ${scene.id}: ${audioBytes.length} bytes`);
      
      // Check if we have actual audio content
      if (!audioBytes || audioBytes.length === 0) {
        console.error(`Audio file is empty for scene ${scene.id}`);
        return '';
      }
      
      // Create proper request object with correct type for the encoding
      const request = {
        audio: {
          content: audioBytes.toString('base64')
        },
        config: {
          encoding: 'LINEAR16' as const, // Use const assertion for proper type
          sampleRateHertz: 16000,
          languageCode: 'en-US',
          audioChannelCount: 1
        }
      };
      
      // Log that we're sending request to Google Speech API
      console.log(`Sending audio recognition request for scene ${scene.id}`);
      
      // Create a wrapped call to handle the API response properly
      try {
        // Use a Promise-based approach to handle the response
        const speechResponse = await new Promise((resolve, reject) => {
          this._speechClient.recognize(request)
            .then(response => {
              console.log(`Successfully received response from Speech API for scene ${scene.id}`);
              resolve(response[0]); // First element of the response contains the actual result
            })
            .catch(error => {
              console.error(`Error from Speech API for scene ${scene.id}:`, error);
              reject(error);
            });
        });
        
        return this.parseTranscriptResponse(speechResponse);
      } catch (recognizeError) {
        console.error(`Error calling Google Speech API for scene ${scene.id}:`, recognizeError);
        return '';
      }
    } catch (speechError) {
      console.error(`Failed to transcribe scene ${scene.id}:`, speechError);
      return ''; // fallback
    } finally {
      // 4) Optionally clean up the temp audio file
      try {
        if (fs.existsSync(audioPath)) {
          fs.unlinkSync(audioPath);
        }
      } catch (cleanupError) {
        console.warn(`Failed to clean up audio file ${audioPath}:`, cleanupError);
      }
    }
  }

  /**
   * Compute a simple textual relevance for demonstration.
   * Uses bag-of-words + cosine similarity.
   * 
   * In production, consider advanced NLP with embeddings, etc.
   */
  private calculateRelevance(sceneTranscript: string | undefined | null, requirementText: string | undefined | null): number {
    // If either input is missing, there's no relevance
    if (!sceneTranscript || !requirementText) {
      console.log('Missing input for relevance calculation:', 
        !sceneTranscript ? 'transcript is empty' : 'requirement text is empty');
      return 0;
    }
    
    const sceneTokens = this.tokenize(sceneTranscript);
    const requirementTokens = this.tokenize(requirementText);
    
    // If either has no tokens, there's no relevance
    if (sceneTokens.length === 0 || requirementTokens.length === 0) {
      return 0;
    }

    const freqScene = this.buildFrequencyMap(sceneTokens);
    const freqReq   = this.buildFrequencyMap(requirementTokens);

    return this.cosineSimilarity(freqScene, freqReq);
  }

  private tokenize(text: string | undefined | null): string[] {
    // Handle undefined or null text input
    if (!text) {
      return [];
    }
    
    return text
      .toLowerCase()
      .split(/\W+/)
      .filter(Boolean);
  }

  private buildFrequencyMap(tokens: string[]): Record<string, number> {
    const freq: Record<string, number> = {};
    for (const token of tokens) {
      freq[token] = (freq[token] || 0) + 1;
    }
    return freq;
  }

  private cosineSimilarity(
    freq1: Record<string, number>,
    freq2: Record<string, number>
  ): number {
    // Combine keys from both frequency maps without using Set iteration
    const allTokens = Array.from(new Set([...Object.keys(freq1), ...Object.keys(freq2)]));
    
    let dotProduct = 0;
    let mag1 = 0;
    let mag2 = 0;

    for (const token of allTokens) {
      const val1 = freq1[token] || 0;
      const val2 = freq2[token] || 0;
      dotProduct += val1 * val2;
      mag1 += val1 * val1;
      mag2 += val2 * val2;
    }

    if (mag1 === 0 || mag2 === 0) {
      return 0; // If either is empty, there's no similarity
    }
    return dotProduct / (Math.sqrt(mag1) * Math.sqrt(mag2));
  }
  
  /**
   * Parse response from Google Speech API to extract transcript
   * @param response The response from Google Speech API
   * @returns The extracted transcript as a string
   */
  private parseTranscriptResponse(response: any): string {
    if (!response || !response.results || response.results.length === 0) {
      return '';
    }
    
    try {
      const transcript = response.results
        .map((result: any) => {
          if (result.alternatives && result.alternatives.length > 0) {
            return result.alternatives[0].transcript;
          }
          return null;
        })
        .filter(Boolean)
        .join('\n');
        
      return transcript.trim();
    } catch (parseError) {
      console.error('Error parsing transcript response:', parseError);
      return '';
    }
  }

  /**
   * Process scenes for a requirement, generating thumbnails & calculating real transcripts
   */
  async processScenes(scenes: VideoScene[], requirementText: string): Promise<VideoScene[]> {
    const processedScenes: VideoScene[] = [];
    
    for (const scene of scenes) {
      try {
        // Generate thumbnail
        const thumbnailPath = await this.generateThumbnail(scene);

        // Get the actual transcript from Google Cloud
        const transcript = await this.getSceneTranscript(scene);

        // Calculate relevance
        const relevance = this.calculateRelevance(transcript, requirementText);
        
        // Only extract a clip if it meets our relevance threshold
        if (relevance > 0.3) {
          const clipPath = await this.extractClip(scene);
          const processedScene: VideoScene = {
            ...scene,
            thumbnailPath,
            clipPath,
            relevance
          };
          processedScenes.push(processedScene);
        }
      } catch (error) {
        console.error(`Error processing scene ${scene.id}:`, error);
        // Continue with next scene
      }
    }

    // Sort scenes by relevance in descending order
    return processedScenes.sort((a, b) => (b.relevance || 0) - (a.relevance || 0));
  }
}

export default VideoProcessor;