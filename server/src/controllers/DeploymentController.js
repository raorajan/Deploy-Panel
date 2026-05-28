const Deployment = require('../models/DeploymentModel');
const { addToQueue } = require('../workers/deployWorker');

/**
 * Create a new deployment
 * POST /api/deploy
 */
const createDeployment = async (req, res) => {
    try {
        const { clientName, domain, image } = req.body;

        // Validation
        if (!clientName || !domain) {
            return res.status(400).json({
                success: false,
                error: 'Client name and domain are required'
            });
        }

        // Create new deployment
        const deployment = new Deployment({
            clientName: clientName.trim(),
            domain: domain.trim().toLowerCase(),
            image: image?.trim() || 'nginx:latest',
            status: 'Pending'
        });

        await deployment.save();
        
        console.log(`📝 Deployment created: ${deployment._id} for ${clientName}`);

        // Add to queue for background processing
        await addToQueue(deployment._id);

        res.status(201).json({
            success: true,
            message: 'Deployment queued successfully',
            data: {
                id: deployment._id,
                clientName: deployment.clientName,
                domain: deployment.domain,
                status: deployment.status,
                createdAt: deployment.createdAt
            }
        });

    } catch (error) {
        console.error('❌ Create deployment error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Internal server error'
        });
    }
};

/**
 * Get all deployments
 * GET /api/deployments
 */
const getAllDeployments = async (req, res) => {
    try {
        const { status, limit = 50, page = 1 } = req.query;
        
        let query = {};
        if (status) query.status = status;
        
        const skip = (page - 1) * limit;
        
        const deployments = await Deployment.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));
        
        const total = await Deployment.countDocuments(query);
        
        res.status(200).json({
            success: true,
            data: deployments,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / limit)
            }
        });
        
    } catch (error) {
        console.error('❌ Get deployments error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

/**
 * Get deployment by ID
 * GET /api/deployments/:id
 */
const getDeploymentById = async (req, res) => {
    try {
        const deployment = await Deployment.findById(req.params.id);
        
        if (!deployment) {
            return res.status(404).json({
                success: false,
                error: 'Deployment not found'
            });
        }
        
        res.status(200).json({
            success: true,
            data: deployment
        });
        
    } catch (error) {
        console.error('❌ Get deployment error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

/**
 * Get deployment status
 * GET /api/status/:id
 */
const getDeploymentStatus = async (req, res) => {
    try {
        const deployment = await Deployment.findById(req.params.id);
        
        if (!deployment) {
            return res.status(404).json({
                success: false,
                error: 'Deployment not found'
            });
        }
        
        res.status(200).json({
            success: true,
            status: deployment.status,
            errorMessage: deployment.errorMessage,
            data: {
                id: deployment._id,
                clientName: deployment.clientName,
                domain: deployment.domain,
                status: deployment.status,
                createdAt: deployment.createdAt
            }
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

/**
 * Delete deployment
 * DELETE /api/deployments/:id
 */
const deleteDeployment = async (req, res) => {
    try {
        const deployment = await Deployment.findByIdAndDelete(req.params.id);
        
        if (!deployment) {
            return res.status(404).json({
                success: false,
                error: 'Deployment not found'
            });
        }
        
        res.status(200).json({
            success: true,
            message: 'Deployment deleted successfully'
        });
        
    } catch (error) {
        console.error('❌ Delete deployment error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

/**
 * Update deployment status (internal use)
 */
const updateStatus = async (id, status, errorMessage = '') => {
    return await Deployment.findByIdAndUpdate(id, {
        status,
        errorMessage,
        updatedAt: Date.now()
    }, { new: true });
};

module.exports = {
    createDeployment,
    getAllDeployments,
    getDeploymentById,
    getDeploymentStatus,
    deleteDeployment,
    updateStatus
};