import { S3 } from "aws-sdk";
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { isStaticProject } from './utils';
dotenv.config();



const s3 = new S3({
    accessKeyId: process.env.ACCESS_KEY_ID,
    secretAccessKey: process.env.SECRET_ACCESS_KEY,
    endpoint: process.env.ENDPOINT,
    region : "auto",
    signatureVersion : "v4"
})

export async function downloadS3Folder (prefix : string){
    console.log(prefix);
    const allFiles = await s3.listObjectsV2({
        Bucket:'skydeploy',
        Prefix: prefix
    }).promise();

    const allPromises = allFiles.Contents?.map( ({Key}) => {
        return new Promise(async (resolve) => {
            if(!Key){
                resolve("");
                return;
            }
            const finalOutputPath = path.join(__dirname, Key);
            const dirName = path.dirname(finalOutputPath);
            if(!fs.existsSync(dirName)){
                fs.mkdirSync(dirName,{recursive :true});
            }

            const outputFile = fs.createWriteStream(finalOutputPath);
            const s3Stream  = s3.getObject({
                Bucket : "skydeploy",
                Key
            }).createReadStream();
            s3Stream.on("error", (err) => {
                console.error("S3 stream error: ",err);
                resolve("");
            })
            .pipe(outputFile)
            .on("finish", () => resolve(""))
            .on("error", (err) => {
                console.error("File stream error:",err);
                resolve("");
            });
        })
    }) || []
    console.log("awaiting");
    await Promise.all(allPromises?.filter(x => x !==undefined));
}

export function copyFinalDist(id: String){
    const projectPath = path.join(__dirname,`output/${id}`);
    
    if (isStaticProject(id as string)) {
        console.log(`Copying static project ${id} directly`);
        const allFiles = getAllFiles(projectPath);
        allFiles.forEach(file => {
            uploadFile(`build/${id}/` + file.slice(projectPath.length + 1), file);
        });
    } else {
        const folderPath = path.join(__dirname,`output/${id}/build`);
        const allFiles = getAllFiles(folderPath);
        allFiles.forEach(file => {
            uploadFile(`build/${id}/` + file.slice(folderPath.length + 1), file);
        });
    }
}

export function getAllFiles (folderPath : string) {
    let response : string[] = [];

    const allFilesAndFolders  = fs.readdirSync(folderPath);
    allFilesAndFolders.forEach(file =>{
        const fullFilePath  = path.join(folderPath, file);
        if( fs.statSync(fullFilePath).isDirectory()){
            response = response.concat(getAllFiles(fullFilePath))
        } else {
            response.push(fullFilePath);
        }
    });
    return response;
}

export async function uploadFile (fileName : string, localFilePath : string){
    const fileContent = fs.readFileSync(localFilePath);
    const response = await s3.upload({
        Body: fileContent,
        Bucket : "skydeploy",
        Key: fileName,
    }).promise();
    console.log(response);
}

