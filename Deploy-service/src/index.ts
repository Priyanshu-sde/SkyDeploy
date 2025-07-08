import {createClient} from 'redis';
import { downloadS3Folder } from './aws';
import { buildProject } from './utils';
const subscriber = createClient();
subscriber.connect();

async function main() {
    while(1){
        const response = await subscriber.brPop(
            'build-queue',
            0
        );
        if(response && response.element ){await downloadS3Folder(`output/${response.element}`)
        await buildProject(response.element);
        }
    }
}

main();