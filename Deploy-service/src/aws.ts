import { S3 } from "aws-sdk";
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';


const s3 = new S3({
    accessKeyId: process.env.Access_Key_ID,
    secretAccessKey: process.env.Secret_Access_Key,
    endpoint: process.env.Cloud_Url
})

export async function downloadS3Folder (prefix : string){
    console.log(prefix);
    const allFiles = await s3.listObjectsV2({
        Bucket:'vercel',
        Prefix: prefix
    }).promise();

    const allPromises = allFiles.Contents?.map(async ({Key}) => {
        return new Promise(async (resolve) => {
            if(!Key){
                resolve("");
                return;
            }
            const finalOutputPath = path.join(__dirname, Key);
            const outputFile = fs.createWriteStream(finalOutputPath);
            const dirName = path.dirname(finalOutputPath);
            if(!fs.existsSync(dirName)){
                fs.mkdirSync(dirName,{recursive :true});
            }
            s3.getObject({
                Bucket : "vercel",
                Key
            }).createReadStream().pipe(outputFile).on("finish", () => {
                resolve("");
            })
        })
    }) || []
    console.log("awaiting");
    await Promise.all(allPromises?.filter(x => x !==undefined));
}

export function copyFinalDist(id: String){
    const folderPath = path.join(__dirname,`output/${id}/dist`);
    const allFiles = getAllFiles(folderPath);
    allFiles.forEach(file => {
        uploadFile(`dist/${id}/` + file.slice(folderPath.length+1), file);
    })    
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
        Bucket : "vercel",
        Key: fileName,
    }).promise();
    console.log(response);
}
