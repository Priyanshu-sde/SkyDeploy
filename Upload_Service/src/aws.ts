import AWS from "aws-sdk";
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();

const s3 = new AWS.S3({
    accessKeyId: process.env.ACCESS_KEY_ID,
    secretAccessKey: process.env.SECRET_ACCESS_KEY,
    endpoint: process.env.ENDPOINT,
    region : "auto",
    signatureVersion : "v4"
})

export const uploadFile = async(fileName: string , localFilePath : string) => {
    try {
        console.log(`Uploading file: ${fileName}`);
        const fileContent = fs.readFileSync(localFilePath);
        const response = await s3.upload({
            Body: fileContent,
            Bucket: "skydeploy",
            Key: fileName,         
        }).promise();
        console.log(`Successfully uploaded: ${fileName}`);
        return response;
    } catch (error) {
        console.error(`Error uploading file ${fileName}:`, error);
        throw error; 
    }
}