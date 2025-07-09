import express from "express";
import cors from "cors";
import simpleGit from "simple-git";
import path from "path";
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
app.use(cors());
app.use(express.json());

app.post("/deploy", async (req, res) => {
  const repoUrl = req.body.repoUrl;
  const id = generate();
  await simpleGit().clone(repoUrl, path.join(__dirname, `output/${id}`));

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
   
  });
});

app.get("/status",async (req,res) => {
  const id = req.query.id;
  const response = await subscriber.hGet("status",id as string);
  res.json({
  
  })
})

const logsMap : Record<string,string[]> = {};

function logForId(id : string, line: string){
 
  logsMap[id].push(line);
}

app.get("/logs", (req,res) => {
  const id = req.query.id as string;
  res.json({logs : logsMap[id] || []})
})

app.listen(3001);
