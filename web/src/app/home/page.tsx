"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";

interface Site {
  id: string;
  name: string;
  url: string;
  repoUrl: string;
  status?: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;

export default function HomePage() {
  const { data: session } = useSession();
  const [sites, setSites] = useState<Site[]>([]);
  const [repoUrl, setRepoUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    async function fetchSites() {
      setFetching(true);
      setError("");
      try {
        const res = await fetch("/api/user/sites");
        if (!res.ok) throw new Error("Failed to fetch sites");
        const data = await res.json();
        setSites(data);
      } catch (err) {
        setError("Could not load sites");
      }
      setFetching(false);
    }
    fetchSites();
  }, []);

  const handleDeploy = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const deployRes = await fetch(`${API_BASE}/deploy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoUrl }),
      });
      if (!deployRes.ok) throw new Error("Deploy failed");
      const deployData = await deployRes.json();
      const siteData = {
        id: deployData.id,
        name: repoUrl.split("/").pop()?.replace(/.git$/, "") || "New Site",
        url: `https://${deployData.id}.skydeploy.priyanshu.com`,
        repoUrl,
      };
      const saveRes = await fetch("/api/user/sites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(siteData),
      });
      if (!saveRes.ok) throw new Error("Failed to save site");
      setSites(prev => [siteData, ...prev]);
      setRepoUrl("");
    } catch (err: any) {
      setError(err.message || "Deployment failed");
    }
    setLoading(false);
  };

  return (
    <div className="max-w-3xl mx-auto py-12 px-4">
      <h1 className="text-3xl font-bold mb-8">Welcome, {session?.user?.name || session?.user?.email}!</h1>
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Deploy a new site</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="flex gap-2" onSubmit={handleDeploy}>
            <Input
              type="url"
              placeholder="GitHub repo URL"
              value={repoUrl}
              onChange={e => setRepoUrl(e.target.value)}
              required
            />
            <Button type="submit" disabled={loading}>
              {loading ? "Deploying..." : "Deploy"}
            </Button>
          </form>
          {error && <div className="text-red-500 text-sm mt-2">{error}</div>}
        </CardContent>
      </Card>
      {fetching ? (
        <div className="text-center py-8">Loading your sites...</div>
      ) : (
        <div className="grid gap-6">
          {sites.length === 0 ? (
            <div className="text-center text-muted-foreground">No sites yet. Deploy your first site!</div>
          ) : (
            sites.map(site => (
              <Card key={site.id} className="border shadow-sm">
                <CardHeader>
                  <CardTitle>{site.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <div className="text-sm text-muted-foreground">{site.url}</div>
                      <div className="text-xs text-muted-foreground">Repo: {site.repoUrl}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" asChild>
                        <a href={`/dashboard/${site.id}`}>Dashboard</a>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
} 