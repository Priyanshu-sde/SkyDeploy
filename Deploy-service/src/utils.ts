import {exec, spawn} from "child_process";
import path from "path";
import fs from "fs";
import { sendLog } from './index';

export function isStaticProject(id: string): boolean {
    const projectPath = path.join(__dirname, `output/${id}`);
    
    
    const packageJsonPath = path.join(projectPath, 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
        return true; 
    }
    
    
    const indexHtmlPath = path.join(projectPath, 'index.html');
    if (fs.existsSync(indexHtmlPath)) {
        
        try {
            const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
            if (!packageJson.scripts || !packageJson.scripts.build) {
                return true;
            }
        } catch (error) {
            return true; 
        }
    }
    
    return false;
}

export function buildProject(id: string){
    return new Promise((resolve) => {
        console.log(path.join(__dirname,`output/${id}`));
        
        if (isStaticProject(id)) {
            console.log(`Project ${id} is a static HTML/CSS/JS project, skipping build step`);
            resolve("");
            return;
        }
        
        const child = exec(`cd ${path.join(__dirname,`output/${id}`)} && npm install && npm run build`)
        console.log(child);
        
        child.stdout?.on('data', function(data) {
            const output = data.toString().trim();
            if (output) {
                console.log('stdout: ' + output);
                output.split('\n').forEach((line: string) => {
                    if (line.trim()) {
                        sendLog(id, `[BUILD] ${line.trim()}`);
                    }
                });
            }
        });
        
        child.stderr?.on('data', function (data) {
            const output = data.toString().trim();
            if (output) {
                console.log('stderr: ' + output);
                output.split('\n').forEach((line: string) => {
                    if (line.trim()) {
                        sendLog(id, `[BUILD-ERROR] ${line.trim()}`);
                    }
                });
            }
        });

        child.on('close', function(code) {
            if (code === 0) {
                console.log(`Build completed successfully for project ${id}`);
                sendLog(id, `Build completed successfully for project ${id}`);
            } else {
                console.log(`Build failed for project ${id} with exit code ${code}`);
                sendLog(id, `Build failed for project ${id} with exit code ${code}`);
            }
            resolve("")
        })
    })
}

