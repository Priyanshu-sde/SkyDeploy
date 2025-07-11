import { createClient } from "redis";
import { copyFinalDist, downloadS3Folder } from "./aws";
import { buildProject } from "./utils";

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
      await downloadS3Folder(`output/${response.element}`);
      console.log(response.element);
      await buildProject(response.element);
      copyFinalDist(response.element);
      publisher.hSet("status", response.element, "deployed");
      
    }
  }
}

main();
