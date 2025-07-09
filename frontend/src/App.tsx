import { useState, useEffect, useRef } from "react";
import axios from "axios";
import './App.css'

const BACKEND_URL = "http://api-skydeploy.priyanshu.online";

function App() {
  const [repoUrl, setRepoUrl] = useState("");
  const [deployId, setDeployId] = useState("");
  const [status, setStatus] = useState("");
  const [logs, setLogs] = useState<string[]>([]);
  const [deploying, setDeploying] = useState(false);
  const logsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!deployId) return;
    setStatus("Uploading...");
    const interval = setInterval(async () => {
      const res = await axios.get(`${BACKEND_URL}/status?id=${deployId}`);
      setStatus(res.data.status);
      if (res.data.status === "deployed") {
        clearInterval(interval);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [deployId]);

  useEffect(() => {
    if (!deployId) return;
    const interval = setInterval(async () => {
      const res = await axios.get(`${BACKEND_URL}/logs?id=${deployId}`);
      setLogs(res.data.logs || []);
      if (status === "deployed") clearInterval(interval);
    }, 2000);
    return () => clearInterval(interval);
  }, [deployId, status]);

  useEffect(() => {
    if (logsRef.current) {
      logsRef.current.scrollTop = logsRef.current.scrollHeight;
    }
  }, [logs]);

  const handleDeploy = async () => {
    setDeploying(true);
    setLogs([]);
    setStatus("Uploading...");
    const res = await axios.post(`${BACKEND_URL}/deploy`, { repoUrl });
    setDeployId(res.data.id);
    setDeploying(false);
  };

  return (
    <>
           
      <div style={{ maxWidth: 600, margin: "2rem auto", fontFamily: "sans-serif" }}>
        <h1>SkyDeploy</h1>
        <input
          type="text"
          placeholder="GitHub repo URL"
          value={repoUrl}
          onChange={e => setRepoUrl(e.target.value)}
          style={{ width: "100%", padding: 8, marginBottom: 8 }}
        />
        <button onClick={handleDeploy} disabled={deploying || !repoUrl}>
          {deploying ? "Deploying..." : "Deploy"}
        </button>
        {deployId && (
          <div style={{ marginTop: 24 }}>
            <h3>Status: {status}</h3>
            {status === "deployed" && (
              <div>
                <p>
                  <b>Deployed URL:</b>{" "}
                  <a
                    href={`http://${deployId}.skydeploy.priyanshu.online`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    http://{deployId}.skydeploy.priyanshu.online
                  </a>
                </p>
              </div>
            )}
            <div
              ref={logsRef}
              style={{
                background: "#111",
                color: "#0f0",
                padding: 12,
                marginTop: 16,
                height: 300,
                overflowY: "auto",
                fontFamily: "monospace",
                fontSize: 14,
                borderRadius: 4,
              }}
            >
              {logs.length === 0 ? (
                <span>Waiting for logs...</span>
              ) : (
                logs.map((line, i) => <div key={i}>{line}</div>)
              )}
            </div>
          </div>
        )}
      </div>
    </>
  )
}

export default App
