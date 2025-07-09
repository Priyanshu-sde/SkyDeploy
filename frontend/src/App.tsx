import { useState, useEffect, useRef } from "react";
import axios from "axios";
import './App.css';

const BACKEND_URL = "https://api-skydeploy.priyanshu.online";

interface DeploymentStatus {
  id: string;
  status: string;
  projectType?: string;
  url?: string;
}

function App() {
  const [repoUrl, setRepoUrl] = useState("");
  const [deployments, setDeployments] = useState<DeploymentStatus[]>([]);
  const [logs, setLogs] = useState<Record<string, string[]>>({});
  const [deploying, setDeploying] = useState(false);
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const logsRef = useRef<HTMLDivElement>(null);

  // Poll for status updates
  useEffect(() => {
    if (deployments.length === 0) return;
    
    const interval = setInterval(async () => {
      const updatedDeployments = await Promise.all(
        deployments.map(async (deployment) => {
          try {
            const res = await axios.get(`${BACKEND_URL}/status?id=${deployment.id}`);
            const newStatus = res.data.status;
            
            if (newStatus === "deployed" && !deployment.url) {
              return {
                ...deployment,
                status: newStatus,
                url: `http://${deployment.id}.skydeploy.priyanshu.online`
              };
            }
            
            return { ...deployment, status: newStatus };
          } catch (error) {
            return deployment;
          }
        })
      );
      
      setDeployments(updatedDeployments);
      
      // Stop polling if all deployments are complete
      const allComplete = updatedDeployments.every(d => d.status === "deployed");
      if (allComplete) {
        clearInterval(interval);
      }
    }, 3000);
    
    return () => clearInterval(interval);
  }, [deployments]);

  // Poll for logs
  useEffect(() => {
    if (deployments.length === 0) return;
    
    const interval = setInterval(async () => {
      const updatedLogs = { ...logs };
      
      for (const deployment of deployments) {
        if (deployment.status !== "deployed") {
          try {
            const res = await axios.get(`${BACKEND_URL}/logs?id=${deployment.id}`);
            updatedLogs[deployment.id] = res.data.logs || [];
          } catch (error) {
            console.error(`Failed to fetch logs for ${deployment.id}:`, error);
          }
        }
      }
      
      setLogs(updatedLogs);
    }, 2000);
    
    return () => clearInterval(interval);
  }, [deployments, logs]);

  // Auto-scroll logs
  useEffect(() => {
    if (logsRef.current && activeTab) {
      logsRef.current.scrollTop = logsRef.current.scrollHeight;
    }
  }, [logs, activeTab]);

  const handleDeploy = async () => {
    if (!repoUrl.trim()) return;
    
    setDeploying(true);
    setError(null);
    
    try {
      const res = await axios.post(`${BACKEND_URL}/deploy`, { repoUrl });
      const newDeployment: DeploymentStatus = {
        id: res.data.id,
        status: "Uploaded",
        projectType: res.data.projectType
      };
      
      setDeployments(prev => [newDeployment, ...prev]);
      setActiveTab(newDeployment.id);
      setRepoUrl("");
    } catch (error: any) {
      console.error("Deployment failed:", error);
      setError(error.response?.data?.message || "Deployment failed. Please check your repository URL and try again.");
    } finally {
      setDeploying(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "deployed": return "#10b981";
      case "building": return "#f59e0b";
      case "Uploaded": return "#3b82f6";
      default: return "#6b7280";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "deployed": return "✓";
      case "building": return "⚡";
      case "Uploaded": return "📤";
      default: return "⏳";
    }
  };

  const clearError = () => setError(null);

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="header-content">
          <div className="logo">
            <div className="logo-icon">🚀</div>
            <h1>SkyDeploy</h1>
          </div>
          <p className="tagline">Deploy your projects with ease</p>
        </div>
      </header>

      {/* Main Content */}
      <main className="main">
        <div className="container">
          {/* Error Message */}
          {error && (
            <div className="error-message">
              <div className="error-content">
                <span className="error-icon">⚠️</span>
                <span>{error}</span>
                <button className="error-close" onClick={clearError}>✕</button>
              </div>
            </div>
          )}

          {/* Deployment Form */}
          <div className="deploy-form">
            <div className="form-group">
              <label htmlFor="repoUrl">Repository URL</label>
              <div className="input-wrapper">
                <input
                  id="repoUrl"
                  type="text"
                  placeholder="https://github.com/username/repository"
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleDeploy()}
                  className="repo-input"
                  disabled={deploying}
                />
                <button 
                  onClick={handleDeploy} 
                  disabled={deploying || !repoUrl.trim()}
                  className="deploy-button"
                >
                  {deploying ? (
                    <>
                      <span className="spinner"></span>
                      Deploying...
                    </>
                  ) : (
                    <>
                      <span className="deploy-icon">🚀</span>
                      Deploy
                    </>
                  )}
                </button>
              </div>
              <p className="form-help">
                Supports GitHub repositories with static HTML/CSS/JS or Node.js projects
              </p>
            </div>
          </div>

          {/* Deployments List */}
          {deployments.length > 0 && (
            <div className="deployments-section">
              <h2>Recent Deployments</h2>
              <div className="deployments-grid">
                {deployments.map((deployment) => (
                  <div 
                    key={deployment.id} 
                    className={`deployment-card ${activeTab === deployment.id ? 'active' : ''}`}
                    onClick={() => setActiveTab(deployment.id)}
                  >
                    <div className="deployment-header">
                      <div className="deployment-id">{deployment.id}</div>
                      <div 
                        className="status-badge"
                        style={{ backgroundColor: getStatusColor(deployment.status) }}
                      >
                        <span className="status-icon">{getStatusIcon(deployment.status)}</span>
                        {deployment.status}
                      </div>
                    </div>
                    
                    {deployment.projectType && (
                      <div className="project-type">
                        Type: <span className="type-badge">{deployment.projectType}</span>
                      </div>
                    )}
                    
                    {deployment.url && (
                      <a 
                        href={deployment.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="deployment-url"
                        onClick={(e) => e.stopPropagation()}
                      >
                        🌐 View Site
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Logs Section */}
          {activeTab && logs[activeTab] && (
            <div className="logs-section">
              <div className="logs-header">
                <h3>Deployment Logs</h3>
                <button 
                  className="close-logs"
                  onClick={() => setActiveTab(null)}
                >
                  ✕
                </button>
              </div>
              <div 
                ref={logsRef}
                className="logs-container"
              >
                {logs[activeTab].length === 0 ? (
                  <div className="no-logs">
                    <div className="loading-dots">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                    Waiting for logs...
                  </div>
                ) : (
                  logs[activeTab].map((line, i) => (
                    <div key={i} className="log-line">
                      {line}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Empty State */}
          {deployments.length === 0 && !deploying && (
            <div className="empty-state">
              <div className="empty-icon">📦</div>
              <h3>Ready to Deploy</h3>
              <p>Enter a GitHub repository URL above to start your first deployment</p>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="footer">
        <p>Powered by SkyDeploy • Deploy static and dynamic projects instantly</p>
      </footer>
    </div>
  );
}

export default App;
