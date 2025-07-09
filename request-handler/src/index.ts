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
    console.log(host);
    const id = host.split(".")[0];
    const filePath = req.params.path ? `/${req.params.path}` : "";

    try {
        const contents = await s3.getObject({
            Bucket : "skydeploy",
            Key : `build/${id}/${filePath}`
        }).promise();
        
        const type = filePath.endsWith("html") ? "text/html" : 
                    filePath.endsWith("css") ? "text/css" : 
                    filePath.endsWith("js") ? "application/javascript" :
                    "application/octet-stream";
        
        res.set("Content-Type", type);
        res.send(contents.Body);
    } catch (error) {
        console.error(`Error fetching ${id}${filePath}:`, error);
        res.status(404).send("Build not found");
    }
})  

app.listen(3002);