import  { useState, useEffect, useRef } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Rocket, 
  Github, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  ExternalLink,
  Terminal,
  RefreshCw,
  Copy,
  Eye
} from 'lucide-react';

const API_BASE = 'https://api-skydeploy.priyanshu.online';

const statusColors = {
  'Uploaded': 'bg-blue-100 text-blue-800',
  'building': 'bg-yellow-100 text-yellow-800',
  'deployed': 'bg-green-100 text-green-800',
  'failed': 'bg-red-100 text-red-800',
  'pending': 'bg-gray-100 text-gray-800'
};

const statusIcons = {
  'Uploaded': Clock,
  'building': RefreshCw,
  'deployed': CheckCircle,
  'failed': AlertCircle,
  'pending': Clock
};

type Deployment = {
  id: string;
  projectType: string;
  repoUrl: string;
  status: string;
  timestamp: string;
  url: string;
};

export default function App() {
  const [repoUrl, setRepoUrl] = useState('');
  const [deployments, setDeployments] = useState<Deployment[]>(() => {
    try {
      const stored = localStorage.getItem('skydeploy_deployments');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedDeployment, setSelectedDeployment] = useState<Deployment | null>(null);
  const [logs, setLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Save deployments to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('skydeploy_deployments', JSON.stringify(deployments));
    } catch {}
  }, [deployments]);

  const deployProject = async () => {
    if (!repoUrl.trim()) {
      setError('Please enter a repository URL');
      return;
    }

    if (!repoUrl.includes('github.com')) {
      setError('Please enter a valid GitHub repository URL');
      return;
    }

    let sanitizedRepoUrl = repoUrl.trim();
    if (!sanitizedRepoUrl.endsWith('.git')) {
      sanitizedRepoUrl += '.git';
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_BASE}/deploy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ repoUrl: sanitizedRepoUrl }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      const newDeployment = {
        id: data.id,
        projectType: data.projectType,
        repoUrl: sanitizedRepoUrl,
        status: 'pending',
        timestamp: new Date().toISOString(),
        url: `https://${data.id}.skydeploy.priyanshu.online`
      };

      setDeployments(prev => [newDeployment, ...prev]);
      setSelectedDeployment(newDeployment);
      setRepoUrl('');
      
      startStatusPolling(data.id);
      
    } catch (err) {
      setError(`Deployment failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const startStatusPolling = (deploymentId: string) => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current as NodeJS.Timeout);
    }

    intervalRef.current = setInterval(async () => {
      try {
        const response = await fetch(`${API_BASE}/status?id=${deploymentId}`);
        if (response.ok) {
          const data = await response.json();
          
          setDeployments(prev => 
            prev.map(dep => 
              dep.id === deploymentId 
                ? { ...dep, status: data.status }
                : dep
            )
          );

          if (selectedDeployment?.id === deploymentId) {
            setSelectedDeployment(prev => prev ? { ...prev, status: data.status } : null);
          }

          if (data.status === 'deployed' || data.status === 'failed') {
            if (intervalRef.current) {
              clearInterval(intervalRef.current);
            }
          }
        }
      } catch (err) {
        console.error('Status polling error:', err);
      }
    }, 2000);
  };

  const fetchLogs = async (deploymentId: string) => {
    setLoadingLogs(true);
    try {
      const response = await fetch(`${API_BASE}/logs?id=${deploymentId}`);
      if (response.ok) {
        const data = await response.json();
        setLogs(data.logs || []);
      }
    } catch (err) {
      console.error('Failed to fetch logs:', err);
    } finally {
      setLoadingLogs(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  useEffect(() => {
    if (selectedDeployment) {
      fetchLogs(selectedDeployment.id);
      if (selectedDeployment.status === 'building' || selectedDeployment.status === 'pending') {
        startStatusPolling(selectedDeployment.id);
      }
    }
  }, [selectedDeployment]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const StatusIcon = ({ status }: { status: string }) => {
    const Icon = statusIcons[status as keyof typeof statusIcons] || Clock;
    return <Icon className={`h-4 w-4 ${status === 'building' ? 'animate-spin' : ''}`} />;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Rocket className="h-8 w-8 text-blue-600 mr-2" />
            <h1 className="text-4xl font-bold text-gray-900">SkyDeploy</h1>
          </div>
          <p className="text-red-600 text-lg">Backend is under maintanace However previous generated site will still be live(Dated : 12 july 4:16 AM)</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          <div className="lg:col-span-1">
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Github className="h-5 w-5 mr-2" />
                  Template Repo
                </CardTitle>
                <CardDescription>
                  Use this template to get started quickly
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Input value="https://github.com/Priyanshu-sde/disco-test.git" readOnly />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard('https://github.com/Priyanshu-sde/disco-test.git')}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Github className="h-5 w-5 mr-2" />
                  Deploy Project
                </CardTitle>
                <CardDescription>
                  Enter your GitHub repository URL to deploy
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="repo-url">Repository URL</Label>
                  <Input
                    id="repo-url"
                    placeholder="https://github.com/username/repo"
                    value={repoUrl}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRepoUrl(e.target.value)}
                    onKeyPress={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && deployProject()}
                  />
                </div>
                
                <Button 
                  onClick={deployProject} 
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Deploying...
                    </>
                  ) : (
                    <>
                      <Rocket className="h-4 w-4 mr-2" />
                      Deploy
                    </>
                  )}
                </Button>

                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Recent Deployments</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-64">
                  {deployments.length === 0 ? (
                    <div className="text-gray-500 text-center py-4 space-y-2">
                      <div>No deployments yet</div>
                      <div className="space-y-1">
                        <div>
                          <a
                            href="https://github.com/Priyanshu-sde/disco-test.git"
                            className="text-blue-600 hover:underline break-all"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            https://github.com/Priyanshu-sde/disco-test.git
                          </a>
                        </div>
                        <div>
                          <a
                            href="https://dflds.skydeploy.priyanshu.online"
                            className="text-blue-600 hover:underline break-all"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            https://dflds.skydeploy.priyanshu.online
                          </a>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {deployments.map((deployment) => (
                        <div
                          key={deployment.id}
                          className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                            selectedDeployment?.id === deployment.id
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                          onClick={() => setSelectedDeployment(deployment)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <StatusIcon status={deployment.status} />
                              <span className="font-medium text-sm truncate">
                                {deployment.repoUrl.split('/').pop()}
                              </span>
                            </div>
                            <Badge className={statusColors[deployment.status as keyof typeof statusColors] || statusColors.pending}>
                              {deployment.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          
          <div className="lg:col-span-2">
            {selectedDeployment ? (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center">
                        <StatusIcon status={selectedDeployment.status} />
                        <span className="ml-2">{selectedDeployment.repoUrl.split('/').pop()}</span>
                      </CardTitle>
                      <CardDescription>
                        Deployment ID: {selectedDeployment.id}
                      </CardDescription>
                    </div>
                    <Badge className={statusColors[selectedDeployment.status as keyof typeof statusColors] || statusColors.pending}>
                      {selectedDeployment.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="overview" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="overview">Overview</TabsTrigger>
                      <TabsTrigger value="logs">Logs</TabsTrigger>
                      <TabsTrigger value="settings">Settings</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="overview" className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Status</Label>
                          <div className="flex items-center space-x-2">
                            <StatusIcon status={selectedDeployment.status} />
                            <span className="capitalize">{selectedDeployment.status}</span>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <Label>Project Type</Label>
                          <span className="text-sm text-gray-600">
                            {selectedDeployment.projectType || 'Detecting...'}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Repository URL</Label>
                        <div className="flex items-center space-x-2">
                          <Input value={selectedDeployment.repoUrl} readOnly />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyToClipboard(selectedDeployment.repoUrl)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {selectedDeployment.status === 'deployed' && (
                        <div className="space-y-2">
                          <Label>Live URL</Label>
                          <div className="flex items-center space-x-2">
                            <Input value={selectedDeployment.url} readOnly />
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => copyToClipboard(selectedDeployment.url)}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => window.open(selectedDeployment.url, '_blank')}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </TabsContent>
                    
                    <TabsContent value="logs">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <Label>Deployment Logs</Label>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => fetchLogs(selectedDeployment.id)}
                            disabled={loadingLogs}
                          >
                            {loadingLogs ? (
                              <RefreshCw className="h-4 w-4 animate-spin" />
                            ) : (
                              <RefreshCw className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                        
                        <Card>
                          <CardContent className="p-0">
                            <ScrollArea className="h-96">
                              <div className="p-4 bg-gray-900 text-green-400 font-mono text-sm">
                                {logs.length === 0 ? (
                                  <div className="text-gray-500">No logs available</div>
                                ) : (
                                  logs.map((log, index) => (
                                    <div key={index} className="mb-1">
                                      {log}
                                    </div>
                                  ))
                                )}
                              </div>
                            </ScrollArea>
                          </CardContent>
                        </Card>
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="settings">
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>Deployment Settings</Label>
                          <p className="text-sm text-gray-600">
                            Configure your deployment settings and environment variables.
                          </p>
                        </div>
                        
                        <Alert>
                          <Terminal className="h-4 w-4" />
                          <AlertDescription>
                            Settings panel coming soon. Environment variables and build settings will be configurable here.
                          </AlertDescription>
                        </Alert>
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            ) : (
              <Card className="h-96 flex items-center justify-center">
                <div className="text-center">
                  <Eye className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Select a deployment
                  </h3>
                  <p className="text-gray-600">
                    Choose a deployment from the list to view its details, logs, and settings.
                  </p>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}