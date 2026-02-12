export interface ServiceNode {
  id?: number;
  nodeId: string;
  name: string;
  description?: string;
  nodeType: string;
  status: string;
  ipAddress?: string;
  port?: number;
  hostName?: string;
  environment?: string;
  location?: string;
  owner?: string;
  team?: string;
  configuration?: string;
  healthCheckUrl?: string;
  healthCheckInterval?: number;
  lastHealthCheck?: string;
  healthStatus?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface User {
  id?: number;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  roles: string[];
  department?: string;
  jobTitle?: string;
  enabled: boolean;
  createdAt?: string;
  updatedAt?: string;
  lastLoginAt?: string;
}

export interface NodeHealthLog {
  id?: number;
  serviceNode: ServiceNode;
  checkTime: string;
  status: string;
  responseTime?: number;
  errorMessage?: string;
  details?: string;
  checkedBy?: string;
}

export interface NodeStatistics {
  totalNodes: number;
  activeNodes: number;
  criticalNodes: number;
}

export interface HealthStatusSummary {
  HEALTHY?: number;
  WARNING?: number;
  CRITICAL?: number;
  UNKNOWN?: number;
}
