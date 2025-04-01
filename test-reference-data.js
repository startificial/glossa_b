/**
 * Test script to create test data for reference data feature
 */
import fs from 'fs';
import path from 'path';
import { db } from './server/db.js';
import { schema } from './shared/schema.js';
import { eq } from 'drizzle-orm';

async function createTestData() {
  try {
    // Create sample project if not exists
    const project = await db.query.projects.findFirst({
      where: eq(schema.projects.id, 1)
    });
    
    if (!project) {
      await db.insert(schema.projects).values({
        id: 1,
        name: "Test Project",
        description: "Test project for reference data",
        type: "Software",
        status: "Active"
      });
      console.log("Created test project");
    }
    
    // Check if we have the PDF file already
    const pdfInputData = await db.query.inputData.findFirst({
      where: (data) => 
        eq(data.projectId, 1) && 
        eq(data.type, 'pdf')
    });
    
    if (!pdfInputData) {
      // Add PDF input data
      await db.insert(schema.inputData).values({
        id: 1,
        projectId: 1,
        name: "Test PDF",
        type: "pdf",
        source: "upload",
        status: "processed",
        metadata: {
          path: "uploads/test.pdf"
        }
      });
      console.log("Created PDF input data");
    }
    
    // Add video input data if not exists
    const videoInputData = await db.query.inputData.findFirst({
      where: (data) => 
        eq(data.projectId, 1) && 
        eq(data.type, 'video')
    });
    
    if (!videoInputData) {
      await db.insert(schema.inputData).values({
        id: 2,
        projectId: 1,
        name: "Test Video",
        type: "video",
        source: "upload",
        status: "processed",
        metadata: {
          path: "uploads/sample.mp4"
        }
      });
      console.log("Created video input data");
    }
    
    // Add audio input data if not exists
    const audioInputData = await db.query.inputData.findFirst({
      where: (data) => 
        eq(data.projectId, 1) && 
        eq(data.type, 'audio')
    });
    
    if (!audioInputData) {
      await db.insert(schema.inputData).values({
        id: 3,
        projectId: 1,
        name: "Test Audio",
        type: "audio",
        source: "upload",
        status: "processed",
        metadata: {
          path: "uploads/sample.mp3"
        }
      });
      console.log("Created audio input data");
    }
    
    // Check if we have a requirement already
    const requirement = await db.query.requirements.findFirst({
      where: eq(schema.requirements.projectId, 1)
    });
      
    if (!requirement) {
      // Add a sample requirement
      await db.insert(schema.requirements).values({
        id: 1,
        projectId: 1,
        text: "The system must support multiple file formats including PDF documents, video files, and audio recordings, allowing users to extract requirements from various media types. This should include the ability to process complex PDFs with mixed content, handle video files to extract visual and audio information, and analyze audio recordings for spoken requirements. The system should maintain references to the original source material to provide traceability between requirements and their origins.",
        category: "Functional",
        priority: "High",
        status: "Active",
        sourceCount: 3
      });
      console.log("Created test requirement");
    }
    
    console.log("Test data setup complete!");
  } catch (error) {
    console.error("Error setting up test data:", error);
  }
}

createTestData();
