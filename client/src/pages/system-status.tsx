import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, CheckCircle, XCircle, AlertCircle, Activity } from "lucide-react";

interface HealthCheck {
  timestamp: string;
  status: 'healthy' | 'unhealthy' | 'warning';
  checks: {
    database: { status: string; responseTime: number; error: string | null };
    environment: { status: string; missingVars: string[] };
    openai: { status: string; error: string | null };
    domain: { status: string; currentDomain: string; isCustomDomain?: boolean };
  };
  uptime: number;
  memory: any;
  responseTime: number;
}

interface SystemMetrics {
  timestamp: string;
  system: {
    uptime: number;
    memory: any;
    platform: string;
    nodeVersion: string;
  };
  database: {
    connected: boolean;
    userCount: number;
    connectionTest: string | null;
  };
  domain: {
    current: string;
    isCustomDomain: boolean;
  };
}

export default function SystemStatus() {
  const { data: health, isLoading: healthLoading, refetch: refetchHealth } = useQuery<HealthCheck>({
    queryKey: ['/api/health'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: metrics, isLoading: metricsLoading, refetch: refetchMetrics } = useQuery<SystemMetrics>({
    queryKey: ['/api/monitor'],
    refetchInterval: 60000, // Refresh every minute
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error': case 'unhealthy': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'warning': return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      default: return <Activity className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variant = status === 'healthy' ? 'default' : status === 'warning' ? 'secondary' : 'destructive';
    return <Badge variant={variant}>{status}</Badge>;
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  };

  const formatMemory = (bytes: number) => {
    return `${Math.round(bytes / 1024 / 1024)}MB`;
  };

  if (healthLoading && metricsLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <Activity className="w-6 h-6" />
          <h1 className="text-2xl font-bold">System Status</h1>
        </div>
        <div className="text-center py-8">Loading system status...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="system-status-page">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-6 h-6" />
          <h1 className="text-2xl font-bold">System Status</h1>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              refetchHealth();
              refetchMetrics();
            }}
            data-testid="button-refresh"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Overall Health Status */}
      {health && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {getStatusIcon(health.status)}
              System Health
              {getStatusBadge(health.status)}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-sm">
                <span className="text-gray-500">Response Time:</span>
                <div className="font-mono">{health.responseTime}ms</div>
              </div>
              <div className="text-sm">
                <span className="text-gray-500">Uptime:</span>
                <div className="font-mono">{formatUptime(health.uptime)}</div>
              </div>
              <div className="text-sm">
                <span className="text-gray-500">Memory:</span>
                <div className="font-mono">{formatMemory(health.memory.rss)}</div>
              </div>
              <div className="text-sm">
                <span className="text-gray-500">Last Check:</span>
                <div className="font-mono text-xs">{new Date(health.timestamp).toLocaleTimeString()}</div>
              </div>
            </div>

            {/* Individual Component Status */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t">
              {/* Database Status */}
              <div className="flex items-center gap-2">
                {getStatusIcon(health.checks.database.status)}
                <div>
                  <div className="font-medium text-sm">Database</div>
                  <div className="text-xs text-gray-500">
                    {health.checks.database.responseTime}ms
                  </div>
                  {health.checks.database.error && (
                    <div className="text-xs text-red-500 mt-1">{health.checks.database.error}</div>
                  )}
                </div>
              </div>

              {/* OpenAI API Status */}
              <div className="flex items-center gap-2">
                {getStatusIcon(health.checks.openai.status)}
                <div>
                  <div className="font-medium text-sm">OpenAI API</div>
                  <div className="text-xs text-gray-500">Ready</div>
                  {health.checks.openai.error && (
                    <div className="text-xs text-red-500 mt-1">{health.checks.openai.error}</div>
                  )}
                </div>
              </div>

              {/* Environment Status */}
              <div className="flex items-center gap-2">
                {getStatusIcon(health.checks.environment.status)}
                <div>
                  <div className="font-medium text-sm">Environment</div>
                  <div className="text-xs text-gray-500">
                    {health.checks.environment.missingVars.length === 0 
                      ? 'All vars present' 
                      : `${health.checks.environment.missingVars.length} missing`}
                  </div>
                  {health.checks.environment.missingVars.length > 0 && (
                    <div className="text-xs text-red-500 mt-1">
                      Missing: {health.checks.environment.missingVars.join(', ')}
                    </div>
                  )}
                </div>
              </div>

              {/* Domain Status */}
              <div className="flex items-center gap-2">
                {getStatusIcon(health.checks.domain.status)}
                <div>
                  <div className="font-medium text-sm">Domain</div>
                  <div className="text-xs text-gray-500">
                    {health.checks.domain.currentDomain}
                  </div>
                  <div className="text-xs text-gray-400">
                    {health.checks.domain.isCustomDomain ? 'Custom domain' : 'Replit domain'}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* System Metrics */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>System Metrics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Platform:</span>
                  <div className="font-mono">{metrics.system.platform}</div>
                </div>
                <div>
                  <span className="text-gray-500">Node Version:</span>
                  <div className="font-mono">{metrics.system.nodeVersion}</div>
                </div>
                <div>
                  <span className="text-gray-500">Heap Used:</span>
                  <div className="font-mono">{formatMemory(metrics.system.memory.heapUsed)}</div>
                </div>
                <div>
                  <span className="text-gray-500">Heap Total:</span>
                  <div className="font-mono">{formatMemory(metrics.system.memory.heapTotal)}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Database Metrics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                {metrics.database.connected ? 
                  <CheckCircle className="w-4 h-4 text-green-500" /> : 
                  <XCircle className="w-4 h-4 text-red-500" />
                }
                <span>Connection: {metrics.database.connected ? 'Connected' : 'Disconnected'}</span>
              </div>
              <div className="text-sm">
                <span className="text-gray-500">Total Users:</span>
                <div className="font-mono text-lg">{metrics.database.userCount}</div>
              </div>
              <div className="text-sm">
                <span className="text-gray-500">Domain:</span>
                <div className="font-mono">{metrics.domain.current}</div>
                <div className="text-xs text-gray-400">
                  {metrics.domain.isCustomDomain ? 'Custom domain active' : 'Using Replit domain'}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Domain Verification Status */}
      <Card>
        <CardHeader>
          <CardTitle>Domain Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span>Current Domain:</span>
              <code className="bg-gray-100 px-2 py-1 rounded text-sm">
                {health?.checks.domain.currentDomain || 'Unknown'}
              </code>
            </div>
            <div className="flex items-center justify-between">
              <span>Custom Domain Active:</span>
              <Badge variant={health?.checks.domain.isCustomDomain ? 'default' : 'secondary'}>
                {health?.checks.domain.isCustomDomain ? 'Yes' : 'No'}
              </Badge>
            </div>
            <div className="text-xs text-gray-500 mt-2">
              Ready for domain verification: {health?.checks.domain.isCustomDomain ? '❌ Already using custom domain' : '✅ Ready to verify mynovelcraft.com'}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}