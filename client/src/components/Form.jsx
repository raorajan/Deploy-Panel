import React, { useState } from 'react';
import axios from 'axios';
import './Form.css';
import { toast } from 'react-hot-toast';

const Form = ({ onDeploySuccess }) => {
  const [clientName, setClientName] = useState('');
  const [domain, setDomain] = useState('');
  const [image, setImage] = useState('nginx:latest');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!clientName.trim() || !domain.trim()) {
      setError('Client Name and Domain are required');
      setTimeout(() => setError(''), 3000);
      return;
    }

    setLoading(true);
    setError('');

    try {
      await axios.post('https://deploy-panel.onrender.com/api/deploy', {
        clientName: clientName.trim(),
        domain: domain.trim().toLowerCase(),
        image: image.trim(),
      });

      // Show success toast
      toast.success('✅ Deployment started successfully!');

      // Reset form
      setClientName('');
      setDomain('');
      setImage('nginx:latest');
      
      // Trigger dashboard refresh
      if (onDeploySuccess) onDeploySuccess();
      
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.error || 'Failed to create deployment';
      setError(msg);
      toast.error(msg);
      setTimeout(() => setError(''), 4000);
    } finally {
      setLoading(false);
    }
  };

  const quickImages = ['nginx:latest', 'httpd:latest', 'node:alpine', 'wordpress:latest'];

  return (
    <div className="form-container">
      <div className="form-header">
        <h2>New Deployment</h2>
        <p>Configure and launch a new container</p>
      </div>

      {error && <div className="error-alert">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>
            <span className="label-text">Client Name</span>
            <span className="required">*</span>
          </label>
          <input
            type="text"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            placeholder="e.g., Acme Corporation"
            disabled={loading}
            className="form-input"
          />
        </div>

        <div className="form-group">
          <label>
            <span className="label-text">Domain</span>
            <span className="required">*</span>
          </label>
          <input
            type="text"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            placeholder="example.com"
            disabled={loading}
            className="form-input"
          />
        </div>

        <div className="form-group">
          <label className="label-text">Docker Image</label>
          <input
            type="text"
            value={image}
            onChange={(e) => setImage(e.target.value)}
            placeholder="nginx:latest"
            disabled={loading}
            className="form-input"
          />
          <div className="quick-buttons">
            {quickImages.map(img => (
              <button
                key={img}
                type="button"
                onClick={() => setImage(img)}
                className="quick-image-btn"
                disabled={loading}
              >
                {img}
              </button>
            ))}
          </div>
        </div>

        <button type="submit" disabled={loading} className="deploy-btn">
          {loading ? (
            <>
              <span className="spinner"></span>
              Deploying...
            </>
          ) : (
            <>
              🚀 Deploy Now
            </>
          )}
        </button>
      </form>

      <div className="info-box">
        <span>💡</span>
        <div>
          <strong>Quick Tip</strong>
          <p>Deployments take 2-3 seconds. Status updates automatically every 3 seconds.</p>
        </div>
      </div>
    </div>
  );
};

export default Form;