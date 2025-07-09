import { createClient } from "redis";
import { copyFinalDist, downloadS3Folder } from "./aws";
import { buildProject } from "./utils";
const subscriber = createClient();
subscriber.connect();
const publisher = createClient();
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
