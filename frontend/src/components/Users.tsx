import React, { useState, useEffect } from 'react';
import { userApi } from '../services/api';
import { User } from '../types';
import './Users.css';

const Users: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchTerm, roleFilter, departmentFilter]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await userApi.getAll();
      setUsers(response.data);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    let filtered = users;

    if (searchTerm) {
      filtered = filtered.filter(user =>
        user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.lastName?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (roleFilter) {
      filtered = filtered.filter(user => user.roles.includes(roleFilter));
    }

    if (departmentFilter) {
      filtered = filtered.filter(user => user.department === departmentFilter);
    }

    setFilteredUsers(filtered);
  };

  const getRoleColor = (roles: string[]) => {
    if (roles.includes('ADMIN')) return 'var(--error)';
    if (roles.includes('OPERATOR')) return 'var(--warning)';
    if (roles.includes('USER')) return 'var(--success)';
    return 'var(--text-muted)';
  };

  const formatRoles = (roles: string[]) => {
    return roles.join(', ');
  };

  const getUniqueValues = (field: keyof User) => {
    return [...new Set(users.map(user => user[field]).filter(Boolean))];
  };

  const getUniqueRoles = () => {
    const allRoles = users.flatMap(user => user.roles);
    return [...new Set(allRoles)];
  };

  if (loading) {
    return <div className="users loading">Loading users...</div>;
  }

  return (
    <div className="users">
      <div className="page-header">
        <h1>User Management</h1>
        <button className="btn-primary">Add New User</button>
      </div>

      <div className="filters">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="filter-selects">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="">All Roles</option>
            {getUniqueRoles().map(role => (
              <option key={role} value={role}>{role}</option>
            ))}
          </select>

          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
          >
            <option value="">All Departments</option>
            {getUniqueValues('department').map(dept => (
              <option key={String(dept)} value={String(dept)}>{String(dept)}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="users-table">
        <div className="table-header">
          <div className="col-username">Username</div>
          <div className="col-name">Name</div>
          <div className="col-email">Email</div>
          <div className="col-department">Department</div>
          <div className="col-roles">Roles</div>
          <div className="col-status">Status</div>
          <div className="col-actions">Actions</div>
        </div>

        {filteredUsers.map(user => (
          <div key={user.id} className="table-row">
            <div className="col-username">
              <strong>{user.username}</strong>
            </div>
            <div className="col-name">
              {user.firstName} {user.lastName}
            </div>
            <div className="col-email">{user.email}</div>
            <div className="col-department">{user.department || '-'}</div>
            <div className="col-roles">
              <span
                className="role-badge"
                style={{ backgroundColor: getRoleColor(user.roles) }}
              >
                {formatRoles(user.roles)}
              </span>
            </div>
            <div className="col-status">
              <span className={`status-indicator ${user.enabled ? 'active' : 'inactive'}`}>
                {user.enabled ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div className="col-actions">
              <button className="btn-icon">⚙️</button>
            </div>
          </div>
        ))}
      </div>

      {filteredUsers.length === 0 && (
        <div className="no-data">
          <p>No users found matching your criteria.</p>
        </div>
      )}
    </div>
  );
};

export default Users;
