import express from "express";
import simpleGit from "simple-git";
import path from "path";
import fs from "fs";
import { generate } from "./utils";
import { getAllFiles, cleanupClonedRepo } from "./file";
import { uploadFile } from "./aws";
import { createClient } from "redis";
import axios from "axios";

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

async function getLatestCommit(repoUrl: string): Promise<string | null> {
  const match = repoUrl.match(/github.com[/:]([^/]+)\/([^/.]+)(.git)?/);
  if (!match) return null;
  const owner = match[1];
  const repo = match[2];
  const repoResp = await axios.get(`https://api.github.com/repos/${owner}/${repo}`);
  if (repoResp.status !== 200) return null;
  const repoData = repoResp.data as { default_branch?: string };
  const branch = repoData.default_branch;
  if (!branch) return null;
  const resp = await axios.get(`https://api.github.com/repos/${owner}/${repo}/commits/${branch}`);
  if (resp.status !== 200) return null;
  const data = resp.data as { sha?: string };
  if (!data || typeof data !== "object" || typeof data.sha !== "string") return null;
  return (data as any).sha;
}




app.post("/deploy", async (req, res) => {
  try {
    console.log("Deploy request received:", req.body);
    
    const repoUrl = req.body.repoUrl;
    if (!repoUrl) {
      console.error("No repoUrl provided in request body");
      return res.status(400).json({ error: "repoUrl is required" });
    }
    
    console.log("Processing deployment for:", repoUrl);
    const existingId = await subscriber.hGet("repo_map", repoUrl);
  if (existingId) {
    const lastCommit = await subscriber.hGet("last_commit", repoUrl);
    const latestCommit = await getLatestCommit(repoUrl);
    const status = await subscriber.hGet("status", existingId);
    if (lastCommit && latestCommit && lastCommit === latestCommit && status === "deployed") {
      
      res.json({
        id: existingId,
        projectType: await subscriber.hGet("project_type", existingId),
        url: `https://${existingId}.skydeploy.priyanshu.online`,
        message: "Already deployed and up to date"
      });
      return;
    } else {
      console.log("Redeploying existing project:", existingId);
      
      const outputPath = path.join(__dirname, `output/${existingId}`);
      if (fs.existsSync(outputPath)) {
        console.log("Removing existing output directory");
        fs.rmSync(outputPath, { recursive: true, force: true });
      }
      
      console.log("Cloning repository...");
      await simpleGit().clone(repoUrl, outputPath);
      console.log("Repository cloned successfully");
      
      const projectType = detectProjectType(outputPath);
      console.log("Project type detected:", projectType);
      
      const files = getAllFiles(outputPath);
      console.log(`Found ${files.length} files to upload`);
      
      console.log("Uploading files to S3...");
      await Promise.all(
        files.map((file) =>
          uploadFile(file.slice(__dirname.length + 1), file)
        )
      );
      console.log("Files uploaded successfully");
      
      await cleanupClonedRepo(existingId);
      
      logForId(existingId, ` Files uploaded to S3 successfully`);
      await publisher.lPush("build-queue", existingId);
      await publisher.hSet("status", existingId, "Uploaded");
      await publisher.hSet("project_type", existingId, projectType);
      await publisher.hSet("last_commit", repoUrl, latestCommit || "");
      res.json({
        id: existingId,
        projectType: projectType,
        url: `https://${existingId}.skydeploy.priyanshu.online`,
        message: "Redeploy triggered"
      });
      return;
    }
  }
  
  const id = generate();
  console.log("Generated new deployment ID:", id);
  
  console.log("Cloning repository for new deployment...");
  await simpleGit().clone(repoUrl, path.join(__dirname, `output/${id}`));
  console.log("Repository cloned successfully");
  
  const projectType = detectProjectType(path.join(__dirname, `output/${id}`));
  console.log("Project type detected:", projectType);
  
  const files = getAllFiles(path.join(__dirname, `output/${id}`));
  console.log(`Found ${files.length} files to upload`);
  
  console.log("Uploading files to S3...");
  await Promise.all(
    files.map((file) =>
      uploadFile(file.slice(__dirname.length + 1), file)
    )
  );
  console.log("Files uploaded successfully");
  
  await cleanupClonedRepo(id);
  
  logForId(id, ` Files uploaded to S3 successfully`);
  await publisher.hSet("repo_map", repoUrl, id);
  await publisher.hSet("project_type", id, projectType);
  const latestCommit = await getLatestCommit(repoUrl);
  await publisher.hSet("last_commit", repoUrl, latestCommit || "");
  await publisher.lPush("build-queue", id);
  await publisher.hSet("status", id, "Uploaded");
  res.json({
    id: id,
    projectType: projectType,
    url: `https://${id}.skydeploy.priyanshu.online`,
    message: "New deployment triggered"
  });
  } catch (error) {
    console.error("Error in deploy endpoint:", error);
    res.status(500).json({ 
      error: "Internal server error", 
      message: error instanceof Error ? error.message : "Unknown error" 
    });
  }
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
  const timestamp = new Date().toISOString();
  logsMap[id].push(`[${timestamp}] ${line}`);
}

async function listenForLogs() {
  while (true) {
    try {
      const logData = await subscriber.blPop("logs-queue", 0);
      if (logData && logData.element) {
        const { id, message } = JSON.parse(logData.element);
        logForId(id, message);
      }
    } catch (error) {
      console.error("Error listening for logs:", error);
      await new Promise(resolve => setTimeout(resolve, 1000)); 
    }
  }
}

listenForLogs().catch(console.error);

app.get("/logs", (req,res) => {
  const id = req.query.id as string;
  res.json({logs : logsMap[id] || []})
})

app.get("/health", (req, res) => {
  res.json({ 
    status: "healthy", 
    timestamp: new Date().toISOString(),
    redis: "connected"
  });
});

app.listen(3001, () => {
  console.log("Upload service started on port 3001");
});
