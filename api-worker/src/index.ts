// SkyDeploy API (serverless).
//
// Endpoints (kept identical to the old Upload_Service so the frontend needs no
// change):
//   POST /deploy   { repoUrl, id? }  -> { id, projectType, url, message }
//   GET  /status?id=<id>             -> { status }
//   GET  /logs?id=<id>               -> { logs: string[] }
//
// State lives in Upstash Redis (serverless, free tier) via its REST API.
// /deploy triggers a GitHub Actions run via repository_dispatch; that workflow
// does the actual clone/build/upload and writes status + logs back to Upstash.

export interface Env {
  GITHUB_REPO: string; // "owner/repo"
  SITE_APEX: string; // "skydeploy.priyanshusde.me"
  GITHUB_TOKEN: string;
  UPSTASH_REDIS_REST_URL: string;
  UPSTASH_REDIS_REST_TOKEN: string;
}

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

// Run a single Redis command through the Upstash REST API.
async function redis(env: Env, command: (string | number)[]): Promise<any> {
  const res = await fetch(env.UPSTASH_REDIS_REST_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.UPSTASH_REDIS_REST_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
  });
  const data = (await res.json()) as { result?: any; error?: string };
  if (data.error) throw new Error(`Upstash: ${data.error}`);
  return data.result;
}

// Same shape as the old generate(): a short, subdomain-safe id.
function generateId(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = crypto.getRandomValues(new Uint8Array(5));
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
}

async function triggerBuild(env: Env, repoUrl: string, id: string): Promise<void> {
  const res = await fetch(
    `https://api.github.com/repos/${env.GITHUB_REPO}/dispatches`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.GITHUB_TOKEN}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "skydeploy-api",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        event_type: "deploy",
        client_payload: { repoUrl, id },
      }),
    }
  );
  if (!res.ok) {
    throw new Error(`GitHub dispatch failed: ${res.status} ${await res.text()}`);
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS });
    }

    const url = new URL(request.url);

    try {
      if (request.method === "POST" && url.pathname === "/deploy") {
        const body = (await request.json().catch(() => ({}))) as {
          repoUrl?: string;
          id?: string;
        };
        if (!body.repoUrl) {
          return json({ error: "repoUrl is required" }, 400);
        }

        const id = body.id || generateId();

        await redis(env, ["HSET", "status", id, "queued"]);
        await redis(env, ["HSET", "repo_map", body.repoUrl, id]);
        await redis(env, [
          "RPUSH",
          `logs:${id}`,
          `[${new Date().toISOString()}] Deployment queued`,
        ]);

        await triggerBuild(env, body.repoUrl, id);

        return json({
          id,
          projectType: "detecting",
          url: `https://${id}.${env.SITE_APEX}`,
          message: "New deployment triggered",
        });
      }

      if (request.method === "GET" && url.pathname === "/status") {
        const id = url.searchParams.get("id");
        if (!id) return json({ error: "id is required" }, 400);
        const status = await redis(env, ["HGET", "status", id]);
        return json({ status });
      }

      if (request.method === "GET" && url.pathname === "/logs") {
        const id = url.searchParams.get("id");
        if (!id) return json({ error: "id is required" }, 400);
        const logs = (await redis(env, ["LRANGE", `logs:${id}`, 0, -1])) || [];
        return json({ logs });
      }

      if (url.pathname === "/health") {
        return json({ status: "healthy", timestamp: new Date().toISOString() });
      }

      return json({ error: "Not found" }, 404);
    } catch (error) {
      return json(
        { error: error instanceof Error ? error.message : "Unknown error" },
        500
      );
    }
  },
};
