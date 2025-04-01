// Poll the API until the project is created
const checkProject = async () => {
  try {
    const response = await fetch('http://localhost:5000/api/projects');
    const projects = await response.json();
    
    if (projects.length > 0) {
      const project = projects[0];
      console.log('Project found:', project);
      
      // Create PDF input data
      const pdfResponse = await fetch(`http://localhost:5000/api/projects/${project.id}/input-data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: 'Test PDF',
          type: 'pdf',
          source: 'upload',
          status: 'processed',
          metadata: {
            path: 'uploads/test.pdf'
          }
        })
      });
      
      if (pdfResponse.ok) {
        console.log('PDF input data created');
      } else {
        console.error('Failed to create PDF input data:', await pdfResponse.text());
      }
      
      // Create video input data
      const videoResponse = await fetch(`http://localhost:5000/api/projects/${project.id}/input-data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: 'Test Video',
          type: 'video',
          source: 'upload',
          status: 'processed',
          metadata: {
            path: 'uploads/sample.mp4'
          }
        })
      });
      
      if (videoResponse.ok) {
        console.log('Video input data created');
      } else {
        console.error('Failed to create video input data:', await videoResponse.text());
      }
      
      // Create audio input data
      const audioResponse = await fetch(`http://localhost:5000/api/projects/${project.id}/input-data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: 'Test Audio',
          type: 'audio',
          source: 'upload',
          status: 'processed',
          metadata: {
            path: 'uploads/sample.mp3'
          }
        })
      });
      
      if (audioResponse.ok) {
        console.log('Audio input data created');
      } else {
        console.error('Failed to create audio input data:', await audioResponse.text());
      }
      
      // Create a test requirement
      const requirementResponse = await fetch(`http://localhost:5000/api/projects/${project.id}/requirements`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: "The system must support multiple file formats including PDF documents, video files, and audio recordings, allowing users to extract requirements from various media types. This should include the ability to process complex PDFs with mixed content, handle video files to extract visual and audio information, and analyze audio recordings for spoken requirements. The system should maintain references to the original source material to provide traceability between requirements and their origins.",
          category: "Functional",
          priority: "High",
          status: "Active",
          sourceCount: 3
        })
      });
      
      if (requirementResponse.ok) {
        console.log('Requirement created');
      } else {
        console.error('Failed to create requirement:', await requirementResponse.text());
      }
      
      return true;
    } else {
      console.log('No projects found yet, retrying...');
      return false;
    }
  } catch (error) {
    console.error('Error checking for projects:', error);
    return false;
  }
};

// Poll every 1 second until project is created
const pollForProject = async () => {
  let projectFound = false;
  
  while (!projectFound) {
    projectFound = await checkProject();
    
    if (!projectFound) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  console.log('Test data creation complete!');
};

pollForProject();
