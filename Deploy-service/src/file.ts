import fs from 'fs';
import path from 'path';


export async function cleanupClonedRepo(deploymentId: string): Promise<void> {
    try {
      const outputPath = path.join(__dirname, `output/${deploymentId}`);
      if (fs.existsSync(outputPath)) {
        fs.rmSync(outputPath, { recursive: true, force: true });
        console.log(`Cleaned up cloned repository for deployment ${deploymentId}`);
      } else {
        console.log(`No repository directory found for deployment ${deploymentId}`);
      }
    } catch (error) {
      console.error(`Error cleaning up repository for deployment ${deploymentId}:`, error);
     
    }
  }