const express = require('express');
const router = express.Router();
const {
    createDeployment,
    getAllDeployments,
    getDeploymentById,
    getDeploymentStatus,
    deleteDeployment
} = require('../controllers/DeploymentController');

// Routes
router.post('/deploy', createDeployment);
router.get('/deployments', getAllDeployments);
router.get('/deployments/:id', getDeploymentById);
router.get('/status/:id', getDeploymentStatus);
router.delete('/deployments/:id', deleteDeployment);

// Health check route
router.get('/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'API is running',
        timestamp: new Date().toISOString()
    });
});

module.exports = router;