import express, { Request } from "express";
import { S3 } from "aws-sdk";
import dotenv from "dotenv";
import cors from "cors";
dotenv.config();

const app = express();

app.use(cors({
  origin: true, 
  credentials: true
}));

const s3 = new S3({
    accessKeyId: process.env.ACCESS_KEY_ID,
    secretAccessKey: process.env.SECRET_ACCESS_KEY,
    endpoint: process.env.ENDPOINT,
    region : "auto",
    signatureVersion : "v4"
})

app.get("/{*path}", async (req: Request<{ path?: string }>, res) => {
    const host = req.hostname;
    console.log("Host:", host);
    const id = host.split(".")[0];
    let filePath = req.params.path ? `/${req.params.path}` : "";
    
    console.log("ID:", id);
    console.log("FilePath:", filePath);
    console.log("Full URL:", req.url);
    
    if (filePath === "" || filePath === "/") {
        filePath = "/index.html";
    }
    
    const s3Key = `build/${id}${filePath}`;
    console.log("Requesting S3 key:", s3Key);

    try {
        const contents = await s3.getObject({
            Bucket : "skydeploy",
            Key : s3Key
        }).promise();
        
        const type = filePath.endsWith("html") ? "text/html" : 
                    filePath.endsWith("css") ? "text/css" : 
                    filePath.endsWith("js") ? "application/javascript" :
                    filePath.endsWith("json") ? "application/json" :
                    filePath.endsWith("ico") ? "image/x-icon" :
                    filePath.endsWith("png") ? "image/png" :
                    filePath.endsWith("svg") ? "image/svg+xml" :
                    "application/octet-stream";
        
        res.set("Content-Type", type);
        res.send(contents.Body);
    } catch (error) {
        console.error(`Error fetching ${s3Key}:`, error);
        res.status(404).send("Build not found");
    }
})  

app.listen(3002);