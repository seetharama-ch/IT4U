import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { serviceNodeApi } from '../services/api';
import { ServiceNode } from '../types';
import './ServiceNodes.css';

const ServiceNodes: React.FC = () => {
  const [nodes, setNodes] = useState<ServiceNode[]>([]);
  const [filteredNodes, setFilteredNodes] = useState<ServiceNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [environmentFilter, setEnvironmentFilter] = useState('');

  useEffect(() => {
    loadServiceNodes();
  }, []);

  useEffect(() => {
    filterNodes();
  }, [nodes, searchTerm, statusFilter, typeFilter, environmentFilter]);

  const loadServiceNodes = async () => {
    try {
      setLoading(true);
      const response = await serviceNodeApi.getAll();
      setNodes(response.data);
    } catch (error) {
      console.error('Error loading service nodes:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterNodes = () => {
    let filtered = nodes;

    if (searchTerm) {
      filtered = filtered.filter(node =>
        node.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        node.nodeId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        node.owner?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter) {
      filtered = filtered.filter(node => node.status === statusFilter);
    }

    if (typeFilter) {
      filtered = filtered.filter(node => node.nodeType === typeFilter);
    }

    if (environmentFilter) {
      filtered = filtered.filter(node => node.environment === environmentFilter);
    }

    setFilteredNodes(filtered);
  };

  const getStatusColor = (status?: string) => {
    switch (status?.toUpperCase()) {
      case 'ACTIVE': return '#10b981';
      case 'INACTIVE': return '#6b7280';
      case 'MAINTENANCE': return '#f59e0b';
      case 'DOWN': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getHealthColor = (status?: string) => {
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

  const getUniqueValues = (field: keyof ServiceNode) => {
    return [...new Set(nodes.map(node => node[field]).filter(Boolean))];
  };

  if (loading) {
    return <div className="service-nodes loading">Loading service nodes...</div>;
  }

  return (
    <div className="service-nodes">
      <div className="page-header">
        <h1>Service Nodes</h1>
        <button className="btn-primary">Add New Node</button>
      </div>

      <div className="filters">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search nodes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="filter-selects">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Status</option>
            {getUniqueValues('status').map(status => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="">All Types</option>
            {getUniqueValues('nodeType').map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>

          <select
            value={environmentFilter}
            onChange={(e) => setEnvironmentFilter(e.target.value)}
          >
            <option value="">All Environments</option>
            {getUniqueValues('environment').map(env => (
              <option key={env} value={env}>{env}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="nodes-table">
        <div className="table-header">
          <div className="col-icon"></div>
          <div className="col-node-id">Node ID</div>
          <div className="col-name">Name</div>
          <div className="col-type">Type</div>
          <div className="col-environment">Environment</div>
          <div className="col-status">Status</div>
          <div className="col-health">Health</div>
          <div className="col-owner">Owner</div>
          <div className="col-actions">Actions</div>
        </div>

        {filteredNodes.map(node => (
          <div key={node.id} className="table-row">
            <div className="col-icon">
              <span className="node-type-icon">{getNodeTypeIcon(node.nodeType)}</span>
            </div>
            <div className="col-node-id">
              <Link to={`/service-nodes/${node.id}`} className="node-link">
                {node.nodeId}
              </Link>
            </div>
            <div className="col-name">{node.name}</div>
            <div className="col-type">{node.nodeType}</div>
            <div className="col-environment">{node.environment || '-'}</div>
            <div className="col-status">
              <span
                className="status-badge"
                style={{ backgroundColor: getStatusColor(node.status) }}
              >
                {node.status}
              </span>
            </div>
            <div className="col-health">
              <span
                className="health-badge"
                style={{ backgroundColor: getHealthColor(node.healthStatus) }}
              >
                {node.healthStatus || 'UNKNOWN'}
              </span>
            </div>
            <div className="col-owner">{node.owner || '-'}</div>
            <div className="col-actions">
              <button className="btn-icon">⚙️</button>
            </div>
          </div>
        ))}
      </div>

      {filteredNodes.length === 0 && (
        <div className="no-data">
          <p>No service nodes found matching your criteria.</p>
        </div>
      )}
    </div>
  );
};

export default ServiceNodes;
