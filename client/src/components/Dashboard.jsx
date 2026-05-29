import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './Dashboard.css';
import DeploymentModal from './DeploymentModal';

const Dashboard = () => {
  const [deployments, setDeployments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [selectedId, setSelectedId] = useState(null);
  const [selectedInitial, setSelectedInitial] = useState(null);

  const fetchDeployments = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const response = await axios.get(`${apiUrl}/api/deployments`);
      // API returns { success: true, data: [...], pagination: {...} }
      const body = response.data;
      const items = Array.isArray(body)
        ? body
        : Array.isArray(body?.data)
        ? body.data
        : [];
      setDeployments(items);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to fetch deployments:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeployments();
    const interval = setInterval(fetchDeployments, 3000);
    return () => clearInterval(interval);
  }, []);

  const getStatusConfig = (status) => {
    const configs = {
      Pending: { icon: '⏳', color: '#f59e0b', bg: '#fffbeb' },
      Processing: { icon: '⚙️', color: '#3b82f6', bg: '#eff6ff' },
      Completed: { icon: '✅', color: '#10b981', bg: '#f0fdf4' },
      Failed: { icon: '❌', color: '#ef4444', bg: '#fef2f2' }
    };
    return configs[status] || configs.Pending;
  };

  const stats = {
    total: deployments.length,
    pending: deployments.filter(d => d.status === 'Pending').length,
    processing: deployments.filter(d => d.status === 'Processing').length,
    completed: deployments.filter(d => d.status === 'Completed').length,
    failed: deployments.filter(d => d.status === 'Failed').length
  };

  const filteredDeployments = filter === 'All' 
    ? deployments 
    : deployments.filter(d => d.status === filter);

  const openModal = (id, initial) => {
    setSelectedId(id)
    setSelectedInitial(initial || null)
  }

  const closeModal = () => {
    setSelectedId(null)
    setSelectedInitial(null)
  }

  return (
    <div className="dashboard">
      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card total">
          <div className="stat-icon">📊</div>
          <div className="stat-info">
            <span className="stat-value">{stats.total}</span>
            <span className="stat-label">Total Deployments</span>
          </div>
        </div>
        <div className="stat-card pending">
          <div className="stat-icon">⏳</div>
          <div className="stat-info">
            <span className="stat-value">{stats.pending}</span>
            <span className="stat-label">Pending</span>
          </div>
        </div>
        <div className="stat-card processing">
          <div className="stat-icon">⚙️</div>
          <div className="stat-info">
            <span className="stat-value">{stats.processing}</span>
            <span className="stat-label">Processing</span>
          </div>
        </div>
        <div className="stat-card completed">
          <div className="stat-icon">✅</div>
          <div className="stat-info">
            <span className="stat-value">{stats.completed}</span>
            <span className="stat-label">Completed</span>
          </div>
        </div>
        <div className="stat-card failed">
          <div className="stat-icon">❌</div>
          <div className="stat-info">
            <span className="stat-value">{stats.failed}</span>
            <span className="stat-label">Failed</span>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="filter-bar">
        <div className="filter-buttons">
          {['All', 'Pending', 'Processing', 'Completed', 'Failed'].map(f => (
            <button
              key={f}
              className={`filter-btn ${filter === f ? 'active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f}
              {f !== 'All' && (
                <span className="filter-count">
                  {f === 'Pending' ? stats.pending :
                   f === 'Processing' ? stats.processing :
                   f === 'Completed' ? stats.completed : stats.failed}
                </span>
              )}
            </button>
          ))}
        </div>
        <div className="refresh-info">
          <span className="live-dot"></span>
          <span>Auto-refresh every 3s</span>
          <span className="last-updated">Updated: {lastUpdated.toLocaleTimeString()}</span>
        </div>
      </div>

      {/* Deployments Table */}
      {loading ? (
        <div className="loading-state">
          <div className="spinner-large"></div>
          <p>Loading deployments...</p>
        </div>
      ) : filteredDeployments.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">🚀</span>
          <h3>No Deployments Yet</h3>
          <p>Create your first deployment using the form on the left</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="deployments-table">
            <thead>
              <tr>
                <th>Status</th>
                <th>Client Name</th>
                <th>Domain</th>
                <th>Docker Image</th>
                <th>Created At</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredDeployments.map((deployment) => {
                const statusConfig = getStatusConfig(deployment.status);
                return (
                  <tr key={deployment._id || deployment.id}>
                    <td>
                      <span className="status-badge" style={{ background: statusConfig.bg, color: statusConfig.color }}>
                        {statusConfig.icon} {deployment.status || 'Pending'}
                      </span>
                    </td>
                    <td className="client-name">{deployment.clientName}</td>
                    <td className="domain">{deployment.domain}</td>
                    <td>
                      <code className="image-code">{deployment.image}</code>
                    </td>
                    <td>{new Date(deployment.createdAt).toLocaleString()}</td>
                    <td>
                      <button className="action-btn view" onClick={() => openModal(deployment._id || deployment.id, deployment)}>View</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {selectedId && (
        <DeploymentModal
          id={selectedId}
          initial={selectedInitial}
          onClose={closeModal}
          onDeleted={() => {
            closeModal()
            fetchDeployments()
          }}
        />
      )}
    </div>
  );
};

export default Dashboard;