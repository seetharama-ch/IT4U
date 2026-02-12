import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { serviceNodeApi, healthLogApi } from '../services/api';
import { ServiceNode, NodeHealthLog } from '../types';
import './NodeDetails.css';

const NodeDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [node, setNode] = useState<ServiceNode | null>(null);
  const [healthLogs, setHealthLogs] = useState<NodeHealthLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [healthCheckRunning, setHealthCheckRunning] = useState(false);

  useEffect(() => {
    if (id) {
      loadNodeDetails(parseInt(id));
    }
  }, [id]);

  const loadNodeDetails = async (nodeId: number) => {
    try {
      setLoading(true);
      const [nodeResponse, logsResponse] = await Promise.all([
        serviceNodeApi.getById(nodeId),
        healthLogApi.getRecent(nodeId, 24)
      ]);

      setNode(nodeResponse.data);
      setHealthLogs(logsResponse.data);
    } catch (error) {
      console.error('Error loading node details:', error);
    } finally {
      setLoading(false);
    }
  };

  const runHealthCheck = async () => {
    if (!id) return;

    try {
      setHealthCheckRunning(true);
      await serviceNodeApi.runHealthCheck(parseInt(id));
      // Reload node details and health logs
      await loadNodeDetails(parseInt(id));
      alert('Health check completed successfully!');
    } catch (error) {
      console.error('Error running health check:', error);
      alert('Failed to run health check');
    } finally {
      setHealthCheckRunning(false);
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status?.toUpperCase()) {
      case 'HEALTHY': return '#10b981';
      case 'WARNING': return '#f59e0b';
      case 'CRITICAL': return '#ef4444';
      case 'UNKNOWN': return '#6b7280';
      default: return '#6b7280';
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

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return <div className="node-details loading">Loading node details...</div>;
  }

  if (!node) {
    return <div className="node-details error">Node not found</div>;
  }

  return (
    <div className="node-details">
      <div className="page-header">
        <div className="breadcrumb">
          <Link to="/service-nodes">Service Nodes</Link>
          <span>/</span>
          <span>{node.name}</span>
        </div>
        <div className="node-actions">
          <button className="btn-secondary">Edit</button>
          <button
            className="btn-primary"
            onClick={runHealthCheck}
            disabled={healthCheckRunning}
          >
            {healthCheckRunning ? 'Running...' : '🔍 Run Health Check'}
          </button>
        </div>
      </div>

      <div className="node-header">
        <div className="node-icon-large">{getNodeTypeIcon(node.nodeType)}</div>
        <div className="node-info">
          <h1>{node.name}</h1>
          <p className="node-id">{node.nodeId}</p>
          <div className="node-status-badges">
            <span
              className="status-badge"
              style={{ backgroundColor: getStatusColor(node.status) }}
            >
              {node.status}
            </span>
            <span
              className="status-badge"
              style={{ backgroundColor: getStatusColor(node.healthStatus) }}
            >
              {node.healthStatus || 'UNKNOWN'}
            </span>
          </div>
        </div>
      </div>

      <div className="tabs">
        <button
          className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button
          className={`tab ${activeTab === 'health' ? 'active' : ''}`}
          onClick={() => setActiveTab('health')}
        >
          Health History
        </button>
        <button
          className={`tab ${activeTab === 'config' ? 'active' : ''}`}
          onClick={() => setActiveTab('config')}
        >
          Configuration
        </button>
      </div>

      <div className="tab-content">
        {activeTab === 'overview' && (
          <div className="overview-grid">
            <div className="info-section">
              <h3>Basic Information</h3>
              <div className="info-grid">
                <div className="info-item">
                  <label>Type:</label>
                  <span>{node.nodeType}</span>
                </div>
                <div className="info-item">
                  <label>Environment:</label>
                  <span>{node.environment || 'N/A'}</span>
                </div>
                <div className="info-item">
                  <label>Location:</label>
                  <span>{node.location || 'N/A'}</span>
                </div>
                <div className="info-item">
                  <label>Owner:</label>
                  <span>{node.owner || 'N/A'}</span>
                </div>
                <div className="info-item">
                  <label>Team:</label>
                  <span>{node.team || 'N/A'}</span>
                </div>
                <div className="info-item">
                  <label>Host Name:</label>
                  <span>{node.hostName || 'N/A'}</span>
                </div>
                <div className="info-item">
                  <label>IP Address:</label>
                  <span>{node.ipAddress || 'N/A'}</span>
                </div>
                <div className="info-item">
                  <label>Port:</label>
                  <span>{node.port || 'N/A'}</span>
                </div>
              </div>
            </div>

            <div className="info-section">
              <h3>Health Information</h3>
              <div className="info-grid">
                <div className="info-item">
                  <label>Health Status:</label>
                  <span
                    className="status-text"
                    style={{ color: getStatusColor(node.healthStatus) }}
                  >
                    {node.healthStatus || 'UNKNOWN'}
                  </span>
                </div>
                <div className="info-item">
                  <label>Last Health Check:</label>
                  <span>{node.lastHealthCheck ? formatDateTime(node.lastHealthCheck) : 'Never'}</span>
                </div>
                <div className="info-item">
                  <label>Health Check URL:</label>
                  <span>{node.healthCheckUrl || 'N/A'}</span>
                </div>
                <div className="info-item">
                  <label>Check Interval:</label>
                  <span>{node.healthCheckInterval ? `${node.healthCheckInterval}s` : 'N/A'}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'health' && (
          <div className="health-history">
            <h3>Recent Health Checks</h3>
            <div className="health-logs">
              {healthLogs.length > 0 ? (
                healthLogs.map(log => (
                  <div key={log.id} className="health-log-item">
                    <div className="log-time">{formatDateTime(log.checkTime)}</div>
                    <div className="log-status">
                      <span
                        className="status-badge"
                        style={{ backgroundColor: getStatusColor(log.status) }}
                      >
                        {log.status}
                      </span>
                    </div>
                    <div className="log-details">
                      {log.responseTime && <span>Response: {log.responseTime}ms</span>}
                      {log.errorMessage && <span className="error">Error: {log.errorMessage}</span>}
                    </div>
                  </div>
                ))
              ) : (
                <p className="no-data">No health check history available</p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'config' && (
          <div className="configuration">
            <h3>Configuration</h3>
            <div className="config-content">
              <p>Description: {node.description || 'No description available'}</p>
              {node.configuration ? (
                <pre className="config-json">{JSON.stringify(JSON.parse(node.configuration), null, 2)}</pre>
              ) : (
                <p>No configuration data available</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NodeDetails;
