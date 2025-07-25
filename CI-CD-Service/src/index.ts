import { createClient } from "redis";
import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

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
    
    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'SkyDeploy-CI-CD'
    };
    
    const githubToken = process.env.GITHUB_TOKEN;
    if (githubToken) {
      headers['Authorization'] = `token ${githubToken}`;
    }
    
    try {
      const repoResp = await axios.get(`https://api.github.com/repos/${owner}/${repo}`, { headers });
      if (repoResp.status !== 200) return null;
      const repoData = repoResp.data as { default_branch?: string };
      const branch = repoData.default_branch;
      if (!branch) return null;
      const resp = await axios.get(`https://api.github.com/repos/${owner}/${repo}/commits/${branch}`, { headers });
      if (resp.status !== 200) return null;
      const data = resp.data as { sha?: string };
      if (!data || typeof data !== "object" || typeof data.sha !== "string") return null;
      return data.sha;
    } catch (error: any) {
      if (error.response?.status === 403 && error.response?.data?.message?.includes('rate limit')) {
        console.error('GitHub API rate limit exceeded. Consider adding a GITHUB_TOKEN environment variable.');
      } else {
        console.error('Error fetching latest commit:', error.message);
      }
      return null;
    }
}

async function triggerDeploy(repoUrl: string,id : string) {
  try {
    const response = await axios.post("http://localhost:3001/deploy", { repoUrl,id });
    console.log("Deploy triggered:", response.data);
    return response.data;
  } catch (error: any) {
    console.error("Error triggering deployment:", error.message);
    throw error;
  }
}

async function poll() {
  await publisher.connect();
  await subscriber.connect();
  
  console.log("CI/CD Service started - polling for repository changes...");
  
  while (true) {
    try {
      const repoMap = await subscriber.hGetAll("repo_map");
      console.log(`Polling ${Object.keys(repoMap).length} repositories for changes...`);
      
      for (const [repoUrl, deploymentId] of Object.entries(repoMap)) {
        try {
          const lastCommit = await subscriber.hGet("last_commit", repoUrl);
          const latestCommit = await getLatestCommit(repoUrl);
          
          if (!latestCommit) {
            console.warn(`Could not fetch latest commit for ${repoUrl}`);
            await sleep(2000);
            continue;
          }
          
          if (lastCommit !== latestCommit) {
            console.log(`Change detected for ${repoUrl}: ${lastCommit} -> ${latestCommit}`);
            
            await publisher.hSet("last_commit", repoUrl, latestCommit);
            
            await triggerDeploy(repoUrl, deploymentId);
            console.log(`Redeploy triggered for ${repoUrl}`);
          }
          
          await sleep(1000);
        } catch (error) {
          console.error(`Error processing repository ${repoUrl}:`, error);
        }
      }
    } catch (err) {
      console.error("Polling error:", err);
    }
    
    console.log("Polling cycle completed, waiting 60 seconds before next cycle...");
    await sleep(60000); 
  }
}

process.on('SIGINT', async () => {
  console.log('Shutting down CI/CD Service...');
  await publisher.quit();
  await subscriber.quit();
  process.exit(0);
});

poll().catch(console.error); 