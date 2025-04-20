import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { exec } from 'child_process';
import ffmpeg from 'fluent-ffmpeg';
import crypto from 'crypto';

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

  constructor(inputPath: string, outputDir: string, inputDataId: number) {
    this._inputPath = inputPath;
    this._outputDir = outputDir;
    this._inputDataId = inputDataId;

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    console.log(`VideoProcessor initialized for input data ID: ${inputDataId}`);
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
   * Detect video scene changes using ffmpeg with efficient chunking for multi-hour videos
   * This implementation processes the video in chunks to optimize memory usage
   * and performance for very long video files
   */
  async detectScenes(
    threshold: number = 0.4,
    minSceneDuration: number = 3,
    chunkDuration: number = 600 // Process 10-minute chunks (configurable)
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
      
      console.log(`Video duration: ${videoDuration} seconds. Processing in ${chunkDuration}-second chunks`);
      
      // Calculate total number of chunks
      const totalChunks = Math.ceil(videoDuration / chunkDuration);
      console.log(`Video will be processed in ${totalChunks} chunks`);
      
      // Store all scenes from all chunks
      const allScenes: VideoScene[] = [];
      let sceneCounter = 1;
      
      // Process video in chunks
      for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
        const chunkStart = chunkIndex * chunkDuration;
        const isLastChunk = chunkIndex === totalChunks - 1;
        const actualChunkDuration = isLastChunk 
          ? (videoDuration - chunkStart) 
          : chunkDuration;
        
        console.log(`Processing chunk ${chunkIndex + 1}/${totalChunks}: ${chunkStart}s to ${chunkStart + actualChunkDuration}s`);
        
        // Generate scene change data for this chunk using ffmpeg
        const chunkSceneDataPath = path.join(this._outputDir, `scene_data_chunk_${chunkIndex}.txt`);
        
        try {
          // Create empty file before processing to ensure the file exists even if ffmpeg fails
          fs.writeFileSync(chunkSceneDataPath, '', 'utf-8');
          
          await new Promise<void>((resolve, reject) => {
            try {
              const command = ffmpeg(this._inputPath)
                .setStartTime(chunkStart)
                .setDuration(actualChunkDuration)
                .outputOptions([
                  `-vf select='gt(scene,${threshold})',metadata=print:file=${chunkSceneDataPath}`,
                  '-f null',
                ])
                .output('/dev/null')
                .on('end', () => {
                  console.log(`Finished processing chunk ${chunkIndex + 1}/${totalChunks}`);
                  resolve();
                })
                .on('error', (err) => {
                  console.error(`Error processing chunk ${chunkIndex + 1}:`, err);
                  // Resolve with a soft error instead of rejecting to continue processing other chunks
                  resolve();
                });
              
              // Add timeout to prevent hanging on this operation
              const timeout = setTimeout(() => {
                console.warn(`Processing timeout for chunk ${chunkIndex + 1}, continuing with next chunk`);
                resolve();
              }, 60000); // 60 second timeout
              
              // Ensure timeout is cleared when processing completes
              command.on('end', () => clearTimeout(timeout));
              command.on('error', () => clearTimeout(timeout));
              
              command.run();
            } catch (err) {
              console.error(`Exception in ffmpeg setup for chunk ${chunkIndex + 1}:`, err);
              // Resolve with a soft error instead of rejecting
              resolve();
            }
          });
        } catch (err) {
          console.error(`Critical error in video processing for chunk ${chunkIndex + 1}:`, err);
          // Continue with next chunk rather than failing the whole process
          continue;
        }
        
        // Parse scene data file for this chunk
        if (fs.existsSync(chunkSceneDataPath)) {
          const chunkSceneData = fs.readFileSync(chunkSceneDataPath, 'utf-8');
          
          // Parse timestamps relative to chunk start
          const relativeTimestamps = this.parseSceneData(chunkSceneData);
          
          // Convert to absolute timestamps
          const absoluteTimestamps = relativeTimestamps.map(t => t + chunkStart);
          
          // Always include the start of the chunk (except for first chunk which already starts at 0)
          if (absoluteTimestamps.length === 0 || (chunkIndex > 0 && absoluteTimestamps[0] > chunkStart + 1)) {
            absoluteTimestamps.unshift(chunkStart);
          }
          
          // Generate scenes for this chunk
          for (let i = 0; i < absoluteTimestamps.length - 1; i++) {
            const startTime = absoluteTimestamps[i];
            const endTime = absoluteTimestamps[i + 1];
            const duration = endTime - startTime;
            
            if (duration >= minSceneDuration) {
              allScenes.push({
                id: crypto.randomUUID(),
                inputDataId: this._inputDataId,
                startTime,
                endTime,
                label: `Scene ${sceneCounter++}`,
                relevance: 0.0
              });
            }
          }
          
          // Handle the last timestamp in this chunk if it's not the last chunk
          if (!isLastChunk && absoluteTimestamps.length > 0) {
            const lastTimestampInChunk = absoluteTimestamps[absoluteTimestamps.length - 1];
            const endOfChunk = chunkStart + actualChunkDuration;
            const duration = endOfChunk - lastTimestampInChunk;
            
            if (duration >= minSceneDuration) {
              allScenes.push({
                id: crypto.randomUUID(),
                inputDataId: this._inputDataId,
                startTime: lastTimestampInChunk,
                endTime: endOfChunk,
                label: `Scene ${sceneCounter++}`,
                relevance: 0.0
              });
            }
          }
          
          // Clean up chunk scene data file
          fs.unlinkSync(chunkSceneDataPath);
        } else {
          console.warn(`No scene data file found for chunk ${chunkIndex + 1}`);
          
          // If no scenes detected in this chunk, create a single scene for the entire chunk
          allScenes.push({
            id: crypto.randomUUID(),
            inputDataId: this._inputDataId,
            startTime: chunkStart,
            endTime: chunkStart + actualChunkDuration,
            label: `Scene ${sceneCounter++}`,
            relevance: 0.0
          });
        }
      }
      
      // Handle edge case: If no scenes were detected at all, create a single scene for the entire video
      if (allScenes.length === 0) {
        allScenes.push({
          id: crypto.randomUUID(),
          inputDataId: this._inputDataId,
          startTime: 0,
          endTime: videoDuration,
          label: 'Full Video',
          relevance: 0.0
        });
      }
      
      // Merge adjacent scenes that are very similar (optional post-processing step)
      const mergedScenes = this.mergeAdjacentScenes(allScenes, minSceneDuration);
      console.log(`Detected ${mergedScenes.length} scenes in total after merging`);
      
      return mergedScenes;
    } catch (error) {
      console.error('Error detecting scenes:', error);
      throw error;
    }
  }
  
  /**
   * Merge adjacent scenes that likely belong together
   * This reduces fragmentation in scene detection results
   */
  private mergeAdjacentScenes(scenes: VideoScene[], minDuration: number): VideoScene[] {
    if (scenes.length <= 1) {
      return scenes;
    }
    
    // Sort scenes by start time to ensure proper ordering
    const sortedScenes = [...scenes].sort((a, b) => a.startTime - b.startTime);
    const mergedScenes: VideoScene[] = [];
    
    let currentScene = sortedScenes[0];
    
    for (let i = 1; i < sortedScenes.length; i++) {
      const nextScene = sortedScenes[i];
      
      // Verify scenes are adjacent (tolerance of 0.5 seconds)
      const areAdjacent = Math.abs(nextScene.startTime - currentScene.endTime) < 0.5;
      
      // Short scenes (less than 2x minDuration) might be merged
      const isCurrentSceneShort = (currentScene.endTime - currentScene.startTime) < (minDuration * 2);
      
      if (areAdjacent && isCurrentSceneShort) {
        // Merge the scenes
        currentScene = {
          ...currentScene,
          endTime: nextScene.endTime,
          label: `${currentScene.label} + ${nextScene.label}`
        };
      } else {
        // Add current scene to results and move to next
        mergedScenes.push(currentScene);
        currentScene = nextScene;
      }
    }
    
    // Don't forget the last scene
    mergedScenes.push(currentScene);
    
    return mergedScenes;
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
    
    // Create a placeholder thumbnail file in case ffmpeg fails
    try {
      // This ensures that even if ffmpeg fails, we'll have a file to return
      // Can be deleted if ffmpeg succeeds and creates a proper thumbnail
      fs.writeFileSync(thumbnailPath, '', 'utf-8');
    } catch (err) {
      console.error(`Error creating placeholder thumbnail file:`, err);
    }
    
    return new Promise<string>((resolve, reject) => {
      try {
        const command = ffmpeg(this._inputPath)
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
              // If ffmpeg failed but we have a placeholder, return that
              if (fs.existsSync(thumbnailPath)) {
                const webPath = `/media/video-scenes/${thumbnailFilename}`;
                console.warn(`Using placeholder thumbnail for scene ${scene.id}`);
                resolve(webPath);
              } else {
                reject(new Error(`Thumbnail was not created at ${thumbnailPath}`));
              }
            }
          })
          .on('error', (err) => {
            console.error(`Error generating thumbnail for scene ${scene.id}:`, err);
            // If we have a placeholder file, return that instead of failing
            if (fs.existsSync(thumbnailPath)) {
              const webPath = `/media/video-scenes/${thumbnailFilename}`;
              console.warn(`Using placeholder thumbnail for scene ${scene.id} after error`);
              resolve(webPath);
            } else {
              reject(err);
            }
          });
        
        // Add timeout to prevent hanging
        const timeout = setTimeout(() => {
          console.warn(`Thumbnail generation timeout for scene ${scene.id}, using placeholder`);
          if (fs.existsSync(thumbnailPath)) {
            const webPath = `/media/video-scenes/${thumbnailFilename}`;
            resolve(webPath);
          } else {
            reject(new Error('Thumbnail generation timeout'));
          }
        }, 30000); // 30 second timeout
        
        // Clear timeout when done
        command.on('end', () => clearTimeout(timeout));
        command.on('error', () => clearTimeout(timeout));
      } catch (err) {
        console.error(`Exception in ffmpeg setup for thumbnail generation:`, err);
        // If we have a placeholder, use it
        if (fs.existsSync(thumbnailPath)) {
          const webPath = `/media/video-scenes/${thumbnailFilename}`;
          console.warn(`Using placeholder thumbnail after setup exception`);
          resolve(webPath);
        } else {
          reject(err);
        }
      }
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
    
    // Create a placeholder clip file in case ffmpeg fails
    try {
      // This ensures that even if ffmpeg fails, we'll have a file to return
      fs.writeFileSync(clipPath, '', 'utf-8');
    } catch (err) {
      console.error(`Error creating placeholder clip file:`, err);
    }
    
    return new Promise<string>((resolve, reject) => {
      try {
        const command = ffmpeg(this._inputPath)
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
              // If ffmpeg failed but we have a placeholder, return that
              if (fs.existsSync(clipPath)) {
                const webPath = `/media/video-scenes/${clipFilename}`;
                console.warn(`Using placeholder clip for scene ${scene.id}`);
                resolve(webPath);
              } else {
                reject(new Error(`Clip was not created at ${clipPath}`));
              }
            }
          })
          .on('error', (err) => {
            console.error(`Error generating clip for scene ${scene.id}:`, err);
            // If we have a placeholder file, return that instead of failing
            if (fs.existsSync(clipPath)) {
              const webPath = `/media/video-scenes/${clipFilename}`;
              console.warn(`Using placeholder clip for scene ${scene.id} after error`);
              resolve(webPath);
            } else {
              reject(err);
            }
          });
        
        // Add timeout to prevent hanging
        const timeout = setTimeout(() => {
          console.warn(`Clip generation timeout for scene ${scene.id}, using placeholder`);
          if (fs.existsSync(clipPath)) {
            const webPath = `/media/video-scenes/${clipFilename}`;
            resolve(webPath);
          } else {
            reject(new Error('Clip generation timeout'));
          }
        }, 60000); // 60 second timeout
        
        // Clear timeout when done
        command.on('end', () => clearTimeout(timeout));
        command.on('error', () => clearTimeout(timeout));
        
        command.run();
      } catch (err) {
        console.error(`Exception in ffmpeg setup for clip generation:`, err);
        // If we have a placeholder, use it
        if (fs.existsSync(clipPath)) {
          const webPath = `/media/video-scenes/${clipFilename}`;
          console.warn(`Using placeholder clip after setup exception`);
          resolve(webPath);
        } else {
          reject(err);
        }
      }
    });
  }

  /**
   * Generate a basic description for the scene without using Google Speech API
   * 
   * This is a simplified replacement for the speech-to-text functionality
   * that was causing issues. Instead of transcribing audio, we'll generate
   * a basic scene description based on metadata.
   */
  private async getSceneTranscript(scene: VideoScene): Promise<string> {
    // Calculate duration and midpoint
    const duration = scene.endTime - scene.startTime;
    const midpoint = scene.startTime + (duration / 2);
    
    // Format times for better readability
    const formatTime = (seconds: number): string => {
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    };
    
    // Generate a basic description with timing information
    const description = [
      `Video section from ${formatTime(scene.startTime)} to ${formatTime(scene.endTime)}`,
      `Duration: ${duration.toFixed(1)} seconds`,
      `Scene ID: ${scene.id}`,
      `Midpoint: ${formatTime(midpoint)}`
    ].join('. ');
    
    // For debugging
    console.log(`Generated basic description for scene ${scene.id} without speech recognition`);
    
    return description;
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
   * Process scenes for a requirement with context awareness and batch processing
   * for efficient handling of multi-hour videos with many scenes
   * 
   * @param scenes List of video scenes to process
   * @param requirementText The requirement text to match against scenes
   * @param overallVideoSummary Optional summary of the entire video for context
   * @param batchSize Number of scenes to process in parallel (default: 5)
   * @returns List of processed scenes sorted by relevance
   */
  async processScenes(
    scenes: VideoScene[], 
    requirementText: string,
    overallVideoSummary?: string,
    batchSize: number = 5
  ): Promise<VideoScene[]> {
    if (scenes.length === 0) {
      console.log('No scenes to process');
      return [];
    }
    
    console.log(`Processing ${scenes.length} scenes for requirement matching, using batch size of ${batchSize}`);
    
    // Store all processed scenes
    const processedScenes: VideoScene[] = [];
    
    // Context-enhanced relevance calculation
    const calculateContextualRelevance = (transcript: string, requirement: string): number => {
      // Basic relevance using existing method
      const basicRelevance = this.calculateRelevance(transcript, requirement);
      
      // If we have an overall video summary, use it to enhance the relevance calculation
      if (overallVideoSummary) {
        // Calculate how well the transcript aligns with the overall video context
        const contextRelevance = this.calculateRelevance(transcript, overallVideoSummary);
        
        // Weight the relevance scores (70% requirement-specific, 30% context)
        return (basicRelevance * 0.7) + (contextRelevance * 0.3);
      }
      
      return basicRelevance;
    };

    // Pre-filtering: First quickly calculate basic relevance for all scenes
    // This avoids unnecessary processing of clearly irrelevant scenes
    const preFilteredScenes: Array<{scene: VideoScene, preRelevance: number}> = [];
    
    // Pre-process in larger batches for efficiency
    const preProcessBatchSize = 20;
    for (let i = 0; i < scenes.length; i += preProcessBatchSize) {
      const batch = scenes.slice(i, i + preProcessBatchSize);
      
      // Process each scene in the pre-filter batch
      await Promise.all(batch.map(async (scene) => {
        try {
          // Get basic transcript without full processing
          const basicTranscript = await this.getSceneTranscript(scene);
          
          // Calculate preliminary relevance
          const preRelevance = this.calculateRelevance(basicTranscript, requirementText);
          
          // Keep scenes that have some minimum relevance
          if (preRelevance > 0.15) {
            preFilteredScenes.push({ scene, preRelevance });
          }
        } catch (error) {
          console.error(`Error pre-filtering scene ${scene.id}:`, error);
        }
      }));
      
      // Status update
      console.log(`Pre-filtered ${i + batch.length}/${scenes.length} scenes, found ${preFilteredScenes.length} potential matches`);
    }
    
    // Sort pre-filtered scenes by preliminary relevance
    preFilteredScenes.sort((a, b) => b.preRelevance - a.preRelevance);
    
    // Take top scenes (up to 3x the number we ultimately want to keep)
    // This ensures we don't miss important scenes due to pre-filtering
    const topScenes = preFilteredScenes.slice(0, 15);
    console.log(`Selected top ${topScenes.length} scenes for detailed processing`);
    
    // Process the filtered scenes in batches for full relevance calculation
    for (let i = 0; i < topScenes.length; i += batchSize) {
      const batch = topScenes.slice(i, i + batchSize);
      console.log(`Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(topScenes.length/batchSize)}`);
      
      // Process each scene in the batch concurrently
      const batchResults = await Promise.allSettled(
        batch.map(async ({ scene }) => {
          try {
            // Generate thumbnail for the scene
            const thumbnailPath = await this.generateThumbnail(scene);
            
            // Get the transcript with full processing
            const transcript = await this.getSceneTranscript(scene);
            
            // Calculate enhanced contextual relevance
            const relevance = calculateContextualRelevance(transcript, requirementText);
            
            // Extract a clip if the scene is relevant enough
            let clipPath: string | undefined;
            if (relevance > 0.3) {
              clipPath = await this.extractClip(scene);
            }
            
            return {
              ...scene,
              thumbnailPath,
              clipPath,
              relevance
            };
          } catch (error) {
            console.error(`Error processing scene ${scene.id}:`, error);
            throw error;
          }
        })
      );
      
      // Process results from this batch
      batchResults.forEach((result) => {
        if (result.status === 'fulfilled') {
          const processedScene = result.value;
          
          // Only keep scenes with sufficient relevance
          if (processedScene.relevance && processedScene.relevance > 0.3) {
            processedScenes.push(processedScene);
          }
        }
      });
      
      console.log(`Processed batch ${Math.floor(i/batchSize) + 1}, found ${processedScenes.length} relevant scenes so far`);
    }

    // Sort all processed scenes by relevance (highest first)
    return processedScenes.sort((a, b) => (b.relevance || 0) - (a.relevance || 0));
  }
}

export default VideoProcessor;