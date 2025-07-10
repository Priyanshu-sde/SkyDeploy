import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;

interface Deployment {
  id: string;
  status: string;
  logs: string[];
  meta?: Record<string, any>;
}

export default function DashboardPage() {
  const { siteId } = useParams();
  const [deployment, setDeployment] = useState<Deployment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchDeployment() {
      setLoading(true);
      setError("");
      try {
        const [statusRes, logsRes] = await Promise.all([
          fetch(`${API_BASE}/status?id=${siteId}`),
          fetch(`${API_BASE}/logs?id=${siteId}`),
        ]);
        if (!statusRes.ok) throw new Error("Failed to fetch status");
        if (!logsRes.ok) throw new Error("Failed to fetch logs");
        const statusData = await statusRes.json();
        const logsData = await logsRes.json();
        setDeployment({
          id: siteId as string,
          status: statusData.status || "unknown",
          logs: logsData.logs || [],
        });
      } catch (err) {
        setError("Could not load deployment info");
      }
      setLoading(false);
    }
    fetchDeployment();
    const interval = setInterval(fetchDeployment, 5000);
    return () => clearInterval(interval);
  }, [siteId]);

  if (loading) return <div className="p-8">Loading...</div>;
  if (error) return <div className="p-8 text-red-500">{error}</div>;
  if (!deployment) return <div className="p-8">No deployment found.</div>;

  return (
    <div className="max-w-2xl mx-auto py-12 px-4">
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Site Dashboard</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <span className={`px-2 py-1 rounded text-xs font-medium ${deployment.status === "live" ? "bg-green-100 text-green-800" : deployment.status === "building" ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-800"}`}>{deployment.status}</span>
          </div>
          <div className="mb-4">
            <h2 className="font-semibold mb-1">Logs</h2>
            <pre className="bg-muted p-2 rounded text-xs overflow-x-auto max-h-48 whitespace-pre-wrap">
              {deployment.logs.length === 0 ? "No logs yet." : deployment.logs.join("\n")}
            </pre>
          </div>
        </CardContent>
      </Card>
      <Button variant="outline" asChild>
        <a href="/home">Back to Home</a>
      </Button>
    </div>
  );
} 