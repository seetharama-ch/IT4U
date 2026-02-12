import React, { useState, useEffect } from 'react';
import { serviceNodeApi, healthLogApi } from '../services/api';
import { ServiceNode, NodeStatistics, HealthStatusSummary } from '../types';
import './Dashboard.css';

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<NodeStatistics | null>(null);
  const [healthSummary, setHealthSummary] = useState<HealthStatusSummary | null>(null);
  const [recentNodes, setRecentNodes] = useState<ServiceNode[]>([]);
  const [criticalNodes, setCriticalNodes] = useState<ServiceNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [healthCheckRunning, setHealthCheckRunning] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [statsResponse, healthResponse, nodesResponse] = await Promise.all([
        serviceNodeApi.getStatistics(),
        healthLogApi.getStatusSummary(24),
        serviceNodeApi.getAll()
      ]);

      setStats(statsResponse.data);
      setHealthSummary(healthResponse.data);

      const nodes = nodesResponse.data;
      setRecentNodes(nodes.slice(0, 5));
      setCriticalNodes(nodes.filter(node => node.healthStatus === 'CRITICAL'));
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const runBulkHealthCheck = async () => {
    try {
      setHealthCheckRunning(true);
      await serviceNodeApi.runBulkHealthCheck();
      // Reload data after health check
      await loadDashboardData();
      alert('Bulk health check completed successfully!');
    } catch (error) {
      console.error('Error running bulk health check:', error);
      alert('Failed to run bulk health check');
    } finally {
      setHealthCheckRunning(false);
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status?.toUpperCase()) {
      case 'HEALTHY': return 'var(--success)';
      case 'WARNING': return 'var(--warning)';
      case 'CRITICAL': return 'var(--error)';
      case 'UNKNOWN': return 'var(--text-muted)';
      default: return 'var(--text-muted)';
    }
  };

  const getNodeTypeIcon = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'web_server': return '🌐';
      case 'database': return '🗄️';
      case 'api_gateway': return '🚪';
      case 'load_balancer': return '⚖️';
      default: return '🔧';
    }
  };

  if (loading) {
    return <div className="dashboard loading">Loading dashboard...</div>;
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div>
          <h1>IT4U Service Node Portal</h1>
          <p>Monitor and manage your service infrastructure</p>
        </div>
        <button
          className="btn-primary"
          onClick={runBulkHealthCheck}
          disabled={healthCheckRunning}
        >
          {healthCheckRunning ? 'Running...' : '🔍 Run Health Check'}
        </button>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <h3>{stats?.totalNodes || 0}</h3>
            <p>Total Nodes</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <h3>{stats?.activeNodes || 0}</h3>
            <p>Active Nodes</p>
          </div>
        </div>

        <div className="stat-card critical">
          <div className="stat-icon">🚨</div>
          <div className="stat-content">
            <h3>{stats?.criticalNodes || 0}</h3>
            <p>Critical Nodes</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">❤️</div>
          <div className="stat-content">
            <h3>{healthSummary?.HEALTHY || 0}</h3>
            <p>Healthy (24h)</p>
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-section">
          <h2>Recent Service Nodes</h2>
          <div className="node-list">
            {recentNodes.map(node => (
              <div key={node.id} className="node-item">
                <div className="node-icon">{getNodeTypeIcon(node.nodeType)}</div>
                <div className="node-info">
                  <h4>{node.name}</h4>
                  <p>{node.nodeId}</p>
                </div>
                <div
                  className="node-status"
                  style={{ backgroundColor: getStatusColor(node.healthStatus) }}
                >
                  {node.healthStatus || 'UNKNOWN'}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="dashboard-section">
          <h2>Critical Nodes</h2>
          <div className="node-list">
            {criticalNodes.length > 0 ? (
              criticalNodes.map(node => (
                <div key={node.id} className="node-item critical">
                  <div className="node-icon">🚨</div>
                  <div className="node-info">
                    <h4>{node.name}</h4>
                    <p>{node.nodeId}</p>
                  </div>
                  <div className="node-status critical">
                    CRITICAL
                  </div>
                </div>
              ))
            ) : (
              <p className="no-data">No critical nodes found 🎉</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
