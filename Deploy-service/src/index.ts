import { createClient } from "redis";
import { copyFinalDist, downloadS3Folder } from "./aws";
import { buildProject } from "./utils";
import { cleanupClonedRepo } from "./file";

export async function sendLog(deploymentId: string, message: string) {
  try {
    await publisher.lPush("logs-queue", JSON.stringify({ id: deploymentId, message }));
  } catch (error) {
    console.error("Error sending log:", error);
  }
}

const redisHost = process.env.REDIS_HOST || 'localhost';
const redisPort = process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT) : 6379;
const subscriber = createClient({ url: `redis://${redisHost}:${redisPort}` });
subscriber.connect();
const publisher = createClient({ url: `redis://${redisHost}:${redisPort}` });
publisher.connect();

async function main() {
  while (1) {
    const response = await subscriber.brPop("build-queue", 0);
    if (response && response.element) {
      const deploymentId = response.element;
      const buildStartTime = new Date();
      
      await sendLog(deploymentId, ` Build started at ${buildStartTime.toISOString()}`);
      await downloadS3Folder(`output/${deploymentId}`);
      console.log(deploymentId);
      await publisher.hSet("status", deploymentId, "Building");
      
      await buildProject(deploymentId);
      
      const buildEndTime = new Date();
      const buildDuration = buildEndTime.getTime() - buildStartTime.getTime();
      await sendLog(deploymentId, ` Build completed at ${buildEndTime.toISOString()} (Duration: ${buildDuration}ms)`);
      
      copyFinalDist(deploymentId);
      cleanupClonedRepo(deploymentId);
      publisher.hSet("status", deploymentId, "deployed");
      
      await sendLog(deploymentId, ` Deployment completed successfully!`);
    }
  }
}

main();
