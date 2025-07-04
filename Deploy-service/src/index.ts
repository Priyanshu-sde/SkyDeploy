import {createClient, commandOptions} from 'redis';
const subscirber = createClient();
subscirber.connect();


async function main() {
    while(1){
        const res = await subscirber.brPop(
            commandOptions({isolate:  true}),
            'build-queue',
        );
        console.log(res);
        
    }
}