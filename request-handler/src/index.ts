import express, { Request } from "express";
import { S3 } from "aws-sdk";
import dotenv from "dotenv";
import cors from "cors";
import path from "path";
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

function getMimeType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes: { [key: string]: string } = {
        '.html': 'text/html',
        '.htm': 'text/html',
        '.css': 'text/css',
        '.js': 'application/javascript',
        '.json': 'application/json',
        '.ico': 'image/x-icon',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.gif': 'image/gif',
        '.svg': 'image/svg+xml',
        '.woff': 'font/woff',
        '.woff2': 'font/woff2',
        '.ttf': 'font/ttf',
        '.eot': 'application/vnd.ms-fontobject',
        '.otf': 'font/otf',
        '.pdf': 'application/pdf',
        '.txt': 'text/plain',
        '.xml': 'application/xml',
        '.webp': 'image/webp',
        '.mp4': 'video/mp4',
        '.webm': 'video/webm',
        '.mp3': 'audio/mpeg',
        '.wav': 'audio/wav'
    };
    
    return mimeTypes[ext] || 'application/octet-stream';
}

app.use(async (req: Request, res) => {
    const host = req.hostname;
    console.log("Host:", host);
    const id = host.split(".")[0];
    let filePath = req.path;
    
    console.log("ID:", id);
    console.log("FilePath:", filePath);
    console.log("Full URL:", req.url);
    
    if (filePath === "/" || filePath === "") {
        filePath = "/index.html";
    }
    
    const s3Key = `build/${id}${filePath}`;
    console.log("Requesting S3 key:", s3Key);

    try {
        const contents = await s3.getObject({
            Bucket : "skydeploy",
            Key : s3Key
        }).promise();
        
        const mimeType = getMimeType(filePath);
        res.set("Content-Type", mimeType);
        
        if (mimeType.startsWith('image/') || mimeType.startsWith('font/') || mimeType.includes('css') || mimeType.includes('javascript')) {
            res.set('Cache-Control', 'public, max-age=31536000'); // 1 year cache for static assets
        }
        
        res.send(contents.Body);
    } catch (error) {
        console.error(`Error fetching ${s3Key}:`, error);
        
        if (filePath !== "/index.html") {
            try {
                const fallbackKey = `build/${id}/index.html`;
                const fallbackContents = await s3.getObject({
                    Bucket: "skydeploy",
                    Key: fallbackKey
                }).promise();
                
                res.set("Content-Type", "text/html");
                res.send(fallbackContents.Body);
                return;
            } catch (fallbackError) {
                console.error(`Fallback to index.html also failed:`, fallbackError);
            }
        }
        
        res.status(404).send("Build not found");
    }
})  

app.listen(3002);