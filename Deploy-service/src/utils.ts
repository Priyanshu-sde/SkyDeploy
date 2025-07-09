import {exec, spawn} from "child_process";
import path from "path";

export function buildProject(id: string){
    return new Promise((resolve) => {
        console.log(path.join(__dirname,`output/${id}`));
        const child = exec(`cd ${path.join(__dirname,`output/${id}`)} && npm install && npm run build`)
        console.log(child);
        child.stdout?.on('data', function(data) {
            console.log('stdout: ' + data);
        });
        child.stderr?.on('data', function (data) {
            console.log('stderr: ' + data);
        });

        child.on('close', function(code) {
            resolve("")
        })
    })
}