import React, { useState } from 'react';
import './App.css';
import Form from './components/Form';
import Dashboard from './components/Dashboard';

function App() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleDeploySuccess = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="app">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="logo">
          <span className="logo-icon">🚀</span>
          <span className="logo-text">DeployPanel</span>
        </div>
        <Form onDeploySuccess={handleDeploySuccess} />
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header className="top-bar">
          <h1>Deployment Dashboard</h1>
          <div className="header-stats">
            <span className="live-badge">● Live</span>
          </div>
        </header>
        <Dashboard key={refreshTrigger} />
      </main>
    </div>
  );
}

export default App;