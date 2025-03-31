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

/**
 * Video processing utility class for extracting scenes from videos
 * and generating thumbnails/clips for requirements
 */
export class VideoProcessor {
  private _inputPath: string;
  private _outputDir: string;
  private _inputDataId: number;
  private _metadataCache: any = null;

  constructor(inputPath: string, outputDir: string, inputDataId: number) {
    this._inputPath = inputPath;
    this._outputDir = outputDir;
    this._inputDataId = inputDataId;
    
    // Create output directory if it doesn't exist
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
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
   * Detect video scene changes using ffmpeg scene detection
   * @param threshold Threshold for scene change detection (0.0 to 1.0)
   * @param minSceneDuration Minimum duration of a scene in seconds
   */
  async detectScenes(threshold: number = 0.4, minSceneDuration: number = 3): Promise<VideoScene[]> {
    try {
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
      
      // Filter short scenes and create scene objects
      const scenes: VideoScene[] = [];
      
      // Always include the start of the video
      sceneTimestamps.unshift(0);
      
      // Convert timestamps to scene ranges
      for (let i = 0; i < sceneTimestamps.length - 1; i++) {
        const startTime = sceneTimestamps[i];
        const endTime = sceneTimestamps[i + 1];
        const duration = endTime - startTime;
        
        if (duration >= minSceneDuration) {
          const scene: VideoScene = {
            id: crypto.randomUUID(),
            inputDataId: this._inputDataId,
            startTime,
            endTime,
            label: `Scene ${i + 1}`,
            relevance: 0.5 // Default relevance score that will be updated later
          };
          
          scenes.push(scene);
        }
      }
      
      // Handle the last scene (to the end of the video)
      const lastStartTime = sceneTimestamps[sceneTimestamps.length - 1];
      
      if (videoDuration - lastStartTime >= minSceneDuration) {
        const scene: VideoScene = {
          id: crypto.randomUUID(),
          inputDataId: this._inputDataId,
          startTime: lastStartTime,
          endTime: videoDuration,
          label: `Scene ${sceneTimestamps.length}`,
          relevance: 0.5 // Default relevance score
        };
        
        scenes.push(scene);
      }
      
      // Clean up temp file
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
    const timestamps: number[] = [];
    const lines = sceneData.split('\n');
    
    for (const line of lines) {
      if (line.includes('pts_time:')) {
        const match = line.match(/pts_time:([\d.]+)/);
        if (match && match[1]) {
          timestamps.push(parseFloat(match[1]));
        }
      }
    }
    
    return timestamps;
  }

  /**
   * Generate thumbnail for a scene
   * @param scene The video scene to generate thumbnail for
   */
  async generateThumbnail(scene: VideoScene): Promise<string> {
    // Capture frame at 1/3 into the scene for better representation
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
          // Return the web-accessible URL path rather than the filesystem path
          const webPath = `/media/video-scenes/${thumbnailFilename}`;
          resolve(webPath);
        })
        .on('error', (err) => reject(err));
    });
  }

  /**
   * Extract a clip from the video for a specific scene
   * @param scene The video scene to extract a clip for
   */
  async extractClip(scene: VideoScene): Promise<string> {
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
          // Return the web-accessible URL path rather than the filesystem path
          const webPath = `/media/video-scenes/${clipFilename}`;
          resolve(webPath);
        })
        .on('error', (err) => reject(err))
        .run();
    });
  }

  /**
   * Calculate scene relevance to a requirement using text similarity
   * This is a placeholder for a more sophisticated algorithm that would use
   * text analysis, speech-to-text, and other methods to determine relevance
   */
  calculateRelevance(scene: VideoScene, requirementText: string): number {
    // This is a placeholder - in a real implementation, this would use
    // more sophisticated text analysis, speech-to-text conversion of the scene audio,
    // and potentially video content analysis
    return Math.random() * 0.5 + 0.5; // Random value between 0.5 and 1.0 for demonstration
  }

  /**
   * Process scenes for a requirement, generating thumbnails and calculating relevance
   */
  async processScenes(scenes: VideoScene[], requirementText: string): Promise<VideoScene[]> {
    const processedScenes: VideoScene[] = [];
    
    for (const scene of scenes) {
      try {
        // Generate thumbnail
        const thumbnailPath = await this.generateThumbnail(scene);
        
        // Calculate relevance
        const relevance = this.calculateRelevance(scene, requirementText);
        
        // Process only scenes with sufficient relevance
        if (relevance > 0.3) {
          // Extract clip for relevant scenes
          const clipPath = await this.extractClip(scene);
          
          // Create processed scene
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
        // Continue with other scenes
      }
    }
    
    // Sort by relevance
    return processedScenes.sort((a, b) => (b.relevance || 0) - (a.relevance || 0));
  }
}

export default VideoProcessor;