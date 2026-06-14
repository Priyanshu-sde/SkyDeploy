// Serves deployed sites from R2 by subdomain.
//
// A request to https://<id>.priyanshusde.me/<path> returns the
// object at R2 key `build/<id>/<path>`, falling back to the site's index.html
// (SPA routing). This is a 1:1 port of the original Express request-handler,
// but as a serverless Worker reading R2 directly via a binding (zero egress,
// zero idle cost, no VM).

export interface Env {
  BUCKET: R2Bucket;
}

function getMimeType(filePath: string): string {
  const ext = filePath.slice(filePath.lastIndexOf(".")).toLowerCase();
  const mimeTypes: Record<string, string> = {
    ".html": "text/html",
    ".htm": "text/html",
    ".css": "text/css",
    ".js": "application/javascript",
    ".json": "application/json",
    ".ico": "image/x-icon",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".svg": "image/svg+xml",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
    ".ttf": "font/ttf",
    ".eot": "application/vnd.ms-fontobject",
    ".otf": "font/otf",
    ".pdf": "application/pdf",
    ".txt": "text/plain",
    ".xml": "application/xml",
    ".webp": "image/webp",
    ".mp4": "video/mp4",
    ".webm": "video/webm",
    ".mp3": "audio/mpeg",
    ".wav": "audio/wav",
  };
  return mimeTypes[ext] || "application/octet-stream";
}

function send(object: R2ObjectBody, filePath: string): Response {
  const mimeType = getMimeType(filePath);
  const headers = new Headers();
  headers.set("Content-Type", mimeType);
  if (
    mimeType.startsWith("image/") ||
    mimeType.startsWith("font/") ||
    mimeType.includes("css") ||
    mimeType.includes("javascript")
  ) {
    headers.set("Cache-Control", "public, max-age=31536000");
  }
  return new Response(object.body, { headers });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const id = url.hostname.split(".")[0];

    // The route is the broad *.priyanshusde.me/*, so ignore non-deploy hosts
    // (these have their own records but we guard in case they're ever proxied).
    const reserved = new Set(["www", "api-skydeploy", "skydeploy"]);
    if (reserved.has(id)) {
      return new Response("Not found", { status: 404 });
    }

    let filePath = url.pathname;
    if (filePath === "/" || filePath === "") {
      filePath = "/index.html";
    }

    const key = `build/${id}${filePath}`;
    const object = await env.BUCKET.get(key);
    if (object) {
      return send(object, filePath);
    }

    // Fall back to the site's index.html for client-side routing.
    if (filePath !== "/index.html") {
      const fallback = await env.BUCKET.get(`build/${id}/index.html`);
      if (fallback) {
        return send(fallback, "/index.html");
      }
    }

    return new Response("Build not found", { status: 404 });
  },
};
