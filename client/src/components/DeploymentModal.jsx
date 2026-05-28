import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { toast } from 'react-hot-toast'
import './DeploymentModal.css'

export default function DeploymentModal({ id, onClose, onDeleted, initial }) {
  const [deployment, setDeployment] = useState(initial || null)
  const [loading, setLoading] = useState(!initial)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!id) return
    const fetchDetails = async () => {
      setLoading(true)
      try {
        const res = await axios.get(`http://localhost:5000/api/deployments/${id}`)
        const data = res.data?.data || res.data
        setDeployment(data)
      } catch (err) {
        console.error('Failed to load deployment details', err)
        toast.error('Failed to load deployment details')
      } finally {
        setLoading(false)
      }
    }

    // always fetch latest details
    fetchDetails()
  }, [id])

  const handleDelete = async () => {
    if (!id) return
    try {
      setDeleting(true)
      await axios.delete(`http://localhost:5000/api/deployments/${id}`)
      toast.success('Deployment deleted')
      if (onDeleted) onDeleted()
      onClose()
    } catch (err) {
      console.error('Delete failed', err)
      toast.error(err.response?.data?.error || 'Delete failed')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            {deployment ? `${deployment.clientName} — ${deployment.domain}` : 'Deployment details'}
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close">×</button>
        </div>

        <div className="modal-body">
          {loading ? (
            <div className="modal-loading">Loading...</div>
          ) : deployment ? (
            <>
              <div className="summary-grid">
                <div><strong>ID</strong><div className="mono">{deployment._id || deployment.id}</div></div>
                <div><strong>Image</strong><div>{deployment.image}</div></div>
                <div><strong>Status</strong><div>{deployment.status}</div></div>
                <div><strong>Container</strong><div>{deployment.containerId || '—'}</div></div>
                <div><strong>Created</strong><div>{new Date(deployment.createdAt).toLocaleString()}</div></div>
                <div><strong>Updated</strong><div>{new Date(deployment.updatedAt || deployment.createdAt).toLocaleString()}</div></div>
              </div>

              <div className="raw-json">
                <strong>Raw JSON</strong>
                <pre>{JSON.stringify(deployment, null, 2)}</pre>
              </div>
            </>
          ) : (
            <div>No details available</div>
          )}
        </div>

        <div className="modal-footer">
          <div className="modal-actions">
            <button className="action-btn delete" onClick={handleDelete} disabled={deleting}>{deleting ? 'Deleting...' : 'Delete'}</button>
            <button className="action-btn" onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    </div>
  )
}
