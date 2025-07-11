import express from "express";
import simpleGit from "simple-git";
import path from "path";
import fs from "fs";
import { generate } from "./utils";
import { getAllFiles } from "./file";
import { uploadFile } from "./aws";
import { createClient } from "redis";

const redisHost = process.env.REDIS_HOST || 'localhost';
const redisPort = process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT) : 6379;
const publisher = createClient({ url: `redis://${redisHost}:${redisPort}` });
const subscriber = createClient({ url: `redis://${redisHost}:${redisPort}` });

publisher.connect();
subscriber.connect();

const app = express();

// app.use(cors({
//   origin: true,
//   credentials: true,
//   methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
//   allowedHeaders: ['Content-Type', 'Authorization']
// }));

// app.options('*', cors());

app.use(express.json());

function detectProjectType(projectPath: string): string {
    const packageJsonPath = path.join(projectPath, 'package.json');
    const indexHtmlPath = path.join(projectPath, 'index.html');
    
    if (!fs.existsSync(packageJsonPath)) {
        return 'static';
    }
    
    if (fs.existsSync(indexHtmlPath)) {
        try {
            const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
            if (!packageJson.scripts || !packageJson.scripts.build) {
                return 'static';
            }
        } catch (error) {
            return 'static';
        }
    }
    
    return 'nodejs';
}

app.post("/deploy", async (req, res) => {
  const repoUrl = req.body.repoUrl;
  const id = generate();
  await simpleGit().clone(repoUrl, path.join(__dirname, `output/${id}`));

  const projectType = detectProjectType(path.join(__dirname, `output/${id}`));
  console.log(`Project ${id} detected as: ${projectType}`);

  const files = getAllFiles(path.join(__dirname, `output/${id}`));
  await Promise.all(
    files.map((file) =>
      uploadFile(file.slice(__dirname.length + 1), file)
    )
  );
  console.log("File Uploaded");
    
  
  await publisher.lPush("build-queue", id);

  await publisher.hSet("status",id,"Uploaded");

  res.json({
    id: id,
    projectType: projectType
  });
});

app.get("/status",async (req,res) => {
  const id = req.query.id;
  const response = await subscriber.hGet("status",id as string);
  res.json({
    status: response
  })
})

const logsMap : Record<string,string[]> = {};

function logForId(id : string, line: string){
  if(!logsMap[id]) logsMap[id] = [];
  logsMap[id].push(line);
}

app.get("/logs", (req,res) => {
  const id = req.query.id as string;
  res.json({logs : logsMap[id] || []})
})

app.listen(3001);
