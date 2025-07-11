import { createClient } from "redis";
import fetch from "node-fetch";
import path from "path";
import fs from "fs";
import simpleGit from "simple-git";
import axios from "axios";

const redisHost = process.env.REDIS_HOST || 'localhost';
const redisPort = process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT) : 6379;
const publisher = createClient({ url: `redis://${redisHost}:${redisPort}` });
const subscriber = createClient({ url: `redis://${redisHost}:${redisPort}` });

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function getLatestCommit(repoUrl: string): Promise<string | null> {
    const match = repoUrl.match(/github.com[/:]([^/]+)\/([^/.]+)(.git)?/);
    if (!match) return null;
    const owner = match[1];
    const repo = match[2];
    const repoResp = await axios.get(`https://api.github.com/repos/${owner}/${repo}`);
    if (repoResp.status !== 200) return null;
    const repoData = repoResp.data;
    const branch = repoData.default_branch;
    const resp = await axios.get(`https://api.github.com/repos/${owner}/${repo}/commits/${branch}`);
    if (resp.status !== 200) return null;
    const data = resp.data;
    return data.sha;
  }
  
  async function triggerDeploy(repoUrl: string) {
    const response = await axios.post("http://upload-service:3001/deploy", { repoUrl });
    console.log("Deploy triggered:", response.data);
    return response.data;
  }
  

async function poll() {
  await publisher.connect();
  await subscriber.connect();
  while (true) {
    try {
      const repoMap = await subscriber.hGetAll("repo_map");
      for (const [repoUrl, deploymentId] of Object.entries(repoMap)) {
        const lastCommit = await subscriber.hGet("last_commit", repoUrl);
        const latestCommit = await getLatestCommit(repoUrl);
        if (!latestCommit) {
          console.warn(`Could not fetch latest commit for ${repoUrl}`);
          continue;
        }
        if (lastCommit !== latestCommit) {
          console.log(`Change detected for ${repoUrl}: ${lastCommit} -> ${latestCommit}`);
          await triggerDeploy(repoUrl);         
          
          console.log(`Redeploy triggered for ${repoUrl}`);
        } 
      }
    } catch (err) {
      console.error("Polling error:", err);
    }
    await sleep(60000); 
  }
}


poll(); 