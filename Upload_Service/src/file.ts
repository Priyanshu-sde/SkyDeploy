import fs from 'fs';
import path from 'path';

export const getAllFiles =  (folderPath: string) => {
    let response: string[] = [];

    const allFilesAndFolders = fs.readdirSync(folderPath);
    allFilesAndFolders.forEach(file => {
        const fullFilePath =  path.join(folderPath, file);
        if(fs.statSync(fullFilePath).isDirectory()){
            response = response.concat(getAllFiles(fullFilePath))
        }
        else{
            response.push(fullFilePath);
        }
    });
    return response;
}

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