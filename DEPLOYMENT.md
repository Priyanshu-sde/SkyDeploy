# Deploying SkyDeploy for free (no 24/7 VM)

The original architecture assumed one always-on EC2 box running Redis + four
Node services. This guide hosts the same product on free, serverless pieces that
idle at **$0** and use **no persistent VM**:

| Original piece                | Free replacement                                   |
| ----------------------------- | -------------------------------------------------- |
| `request-handler` (Express)   | Cloudflare Worker + R2 binding (`request-handler/worker/`) |
| `Upload_Service` HTTP API     | Cloudflare Worker (`api-worker/`)                  |
| `Deploy-service` build worker | GitHub Actions (`.github/workflows/deploy.yml`)    |
| Redis queue                   | the GitHub Actions run queue                       |
| Redis state/logs              | Upstash Redis (serverless free tier)               |
| `web/` (React)                | Cloudflare Pages                                   |
| Storage                       | Cloudflare R2 (already in use)                     |

Flow: **web → api-worker `/deploy` → `repository_dispatch` → GitHub Actions
builds & uploads to R2 → request-handler Worker serves `*.skydeploy...`**.
Status/logs are written to Upstash and read back by the api-worker.

---

## Prerequisites (all free)

1. **Cloudflare account** with `priyanshusde.me` on it, plus the **R2 bucket
   `skydeploy`** (already used by this project).
2. **Upstash account** → create a Redis database → copy its
   `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`.
3. **R2 S3 credentials**: Cloudflare dashboard → R2 → *Manage API Tokens* →
   create an Access Key. Note the **Access Key ID**, **Secret**, and the
   **S3 endpoint** `https://<account_id>.r2.cloudflarestorage.com`.
4. **GitHub PAT**: a classic token with `repo` scope (or fine-grained with
   *Actions: read/write* on this repo). Used to trigger builds.

---

## 1. GitHub Actions (the builder)

In this repo: **Settings → Secrets and variables → Actions → New secret**, add:

- `R2_ENDPOINT` = `https://<account_id>.r2.cloudflarestorage.com`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

Push this repo to GitHub. Test it manually: **Actions → Deploy site → Run
workflow**, enter a repo URL (e.g. a small static site). It should clone, build,
upload to `build/<id>/`, and end with status `deployed`.

## 2. request-handler Worker (serves the sites)

```bash
cd request-handler/worker
npm install
npx wrangler login
npx wrangler deploy
```

Then add a **proxied wildcard DNS record** in Cloudflare (DNS → Records):
`Type: A`, `Name: *.skydeploy`, `IPv4: 192.0.2.1`, **Proxy: ON (orange cloud)**.
The IP is a throwaway — the route in `wrangler.toml`
(`*.skydeploy.priyanshusde.me/*`) intercepts the request and the Worker reads
`build/<id>/...` from R2 before any "origin" is contacted. (A route only fires
on a *proxied* hostname, which is why the dummy proxied record is required.)

## 3. api-worker (the deploy API)

```bash
cd api-worker
npm install
npx wrangler deploy
# secrets (not committed):
npx wrangler secret put GITHUB_TOKEN
npx wrangler secret put UPSTASH_REDIS_REST_URL
npx wrangler secret put UPSTASH_REDIS_REST_TOKEN
```

No DNS step needed here: `wrangler.toml` uses `custom_domain = true`, so
`wrangler deploy` auto-creates the `api-skydeploy.priyanshusde.me` record and
route. This matches `API_BASE` in [web/src/App.tsx](web/src/App.tsx). Edit the
`[vars]` block if your `GITHUB_REPO` or `SITE_APEX` differ.

## 4. Frontend (Cloudflare Pages)

Cloudflare dashboard → **Pages → Create → connect this repo**:

- Build command: `npm run build`
- Build output dir: `dist`
- Root directory: `web`

No code change needed — it already calls `https://api-skydeploy.priyanshusde.me`.

---

## Verify end-to-end

1. Open the Pages URL, paste a GitHub repo, click Deploy.
2. api-worker returns an `id` and triggers the Actions run.
3. The dashboard polls `/status` and `/logs` (served from Upstash) — watch it go
   `queued → building → deployed`.
4. Visit `https://<id>.skydeploy.priyanshusde.me`.

## Notes / limits (free tiers)

- Workers: 100k requests/day free. R2: 10 GB storage + generous ops free.
- GitHub Actions: ~2000 min/mo for private repos, unlimited for public.
- The old `CI-CD-Service` (polls repos for new commits) isn't ported. If you want
  auto-redeploy on push, the simplest free option is a `push` trigger in the
  *deployed* repo, or a scheduled `cron` workflow here that re-dispatches builds.
- The legacy Express services / Docker / PM2 / nginx files are no longer needed
  for this setup; keep them only if you still want the EC2 path as an option.
