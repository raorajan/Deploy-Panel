const { Queue, Worker } = require('bullmq');
const IORedis = require('ioredis');
const Deployment = require('../models/DeploymentModel');

// Redis connection configuration
const redisConnection = new IORedis({
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    retryStrategy: (times) => {
        if (times > 3) {
            console.error('❌ Redis connection failed after 3 retries');
            return null;
        }
        return Math.min(times * 100, 3000);
    }
});

// Test Redis connection
redisConnection.on('connect', () => {
    console.log('✅ Redis connected successfully');
});

redisConnection.on('error', (err) => {
    console.error('❌ Redis connection error:', err.message);
});

// Queue name constant
const QUEUE_NAME = 'deployment-queue';

// Create queue instance
const deploymentQueue = new Queue(QUEUE_NAME, {
    connection: redisConnection,
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 2000
        },
        removeOnComplete: 100,
        removeOnFail: 200
    }
});

/**
 * Mock: Run Docker container on EC2
 * Replace this with actual SSH implementation when AWS is available
 */
async function runDockerOnEC2(containerName, image, domain) {
    console.log(`🐳 [Docker] Starting container deployment:`);
    console.log(`   ├─ Container: ${containerName}`);
    console.log(`   ├─ Image: ${image}`);
    console.log(`   ├─ Domain: ${domain}`);
    console.log(`   └─ Port: 8080 (mapped)`);
    
    // Simulate Docker pull & run (2-3 seconds)
    await new Promise(resolve => setTimeout(resolve, 2500));
    
    const mockContainerId = `container_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    console.log(`✅ [Docker] Container started successfully`);
    console.log(`   └─ Container ID: ${mockContainerId}`);
    
    return { 
        success: true, 
        containerId: mockContainerId,
        message: 'Docker container running on EC2'
    };
}

/**
 * Mock: Trigger AWS Lambda function
 * Replace with actual AWS SDK v3 implementation
 */
async function triggerLambda(deploymentId, clientName, domain) {
    console.log(`⚡ [Lambda] Invoking post-deployment function:`);
    console.log(`   ├─ Deployment ID: ${deploymentId}`);
    console.log(`   ├─ Client: ${clientName}`);
    console.log(`   └─ Domain: ${domain}`);
    
    // Simulate Lambda execution (1 second)
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log(`✅ [Lambda] Function executed successfully`);
    
    return {
        success: true,
        message: 'Lambda post-deployment setup completed',
        statusCode: 200
    };
}

/**
 * Update deployment status in database
 */
async function updateDeploymentStatus(id, status, errorMessage = '', containerId = '') {
    const updateData = {
        status,
        updatedAt: new Date()
    };
    
    if (errorMessage) updateData.errorMessage = errorMessage;
    if (containerId) updateData.containerId = containerId;
    
    return await Deployment.findByIdAndUpdate(id, updateData, { new: true });
}

/**
 * Worker: Process deployment jobs
 */
const worker = new Worker(QUEUE_NAME, async (job) => {
    const { deploymentId } = job.data;
    
    console.log(`\n🚀 [Worker] Processing deployment: ${deploymentId}`);
    console.log(`   ├─ Job ID: ${job.id}`);
    console.log(`   ├─ Attempt: ${job.attemptsMade + 1}/${job.opts.attempts}`);
    
    try {
        // Step 1: Update status to Processing
        await updateDeploymentStatus(deploymentId, 'Processing');
        console.log(`📝 [Worker] Status updated: Pending → Processing`);
        
        // Get deployment details
        const deployment = await Deployment.findById(deploymentId);
        if (!deployment) {
            throw new Error('Deployment not found in database');
        }
        
        console.log(`📋 [Worker] Deployment details:`);
        console.log(`   ├─ Client: ${deployment.clientName}`);
        console.log(`   ├─ Domain: ${deployment.domain}`);
        console.log(`   └─ Image: ${deployment.image}`);
        
        // Step 2: Run Docker on EC2
        console.log(`\n📦 [Worker] Step 1/2: Deploying Docker container...`);
        const containerName = `client-${deployment.clientName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
        const dockerResult = await runDockerOnEC2(containerName, deployment.image, deployment.domain);
        
        if (!dockerResult.success) {
            throw new Error('Docker deployment failed');
        }
        
        // Save container ID
        await updateDeploymentStatus(deploymentId, 'Processing', '', dockerResult.containerId);
        
        // Step 3: Trigger Lambda
        console.log(`\n⚡ [Worker] Step 2/2: Triggering Lambda function...`);
        const lambdaResult = await triggerLambda(deploymentId, deployment.clientName, deployment.domain);
        
        if (!lambdaResult.success) {
            throw new Error('Lambda invocation failed');
        }
        
        // Step 4: Update status to Completed
        await updateDeploymentStatus(deploymentId, 'Completed');
        
        console.log(`\n✅ [Worker] Deployment ${deploymentId} completed successfully!`);
        console.log(`   ├─ Container: ${dockerResult.containerId}`);
        console.log(`   └─ Lambda: ${lambdaResult.statusCode || 'OK'}`);
        
        return { 
            success: true, 
            deploymentId,
            containerId: dockerResult.containerId,
            lambdaStatus: lambdaResult.statusCode
        };
        
    } catch (error) {
        console.error(`\n❌ [Worker] Deployment ${deploymentId} failed:`, error.message);
        
        // Update status to Failed
        await updateDeploymentStatus(deploymentId, 'Failed', error.message);
        
        throw error;
    }
}, {
    connection: redisConnection,
    concurrency: 1, // Process one job at a time
    limiter: {
        max: 1,
        duration: 1000
    }
});

// Worker event handlers
worker.on('completed', (job) => {
    console.log(`🎉 [Worker] Job ${job.id} completed successfully`);
});

worker.on('failed', (job, err) => {
    console.error(`💥 [Worker] Job ${job.id} failed:`, err.message);
});

worker.on('active', (job) => {
    console.log(`🔨 [Worker] Job ${job.id} is now active`);
});

worker.on('stalled', (jobId) => {
    console.warn(`⚠️ [Worker] Job ${jobId} stalled`);
});

/**
 * Add deployment to queue
 */
async function addToQueue(deploymentId) {
    const job = await deploymentQueue.add('deploy-task', {
        deploymentId,
        createdAt: new Date().toISOString()
    }, {
        priority: 1,
        delay: 0
    });
    
    console.log(`📥 [Queue] Added job ${job.id} for deployment ${deploymentId}`);
    return job;
}

/**
 * Get queue statistics
 */
async function getQueueStats() {
    const [waiting, active, completed, failed] = await Promise.all([
        deploymentQueue.getWaitingCount(),
        deploymentQueue.getActiveCount(),
        deploymentQueue.getCompletedCount(),
        deploymentQueue.getFailedCount()
    ]);
    
    return { waiting, active, completed, failed };
}

/**
 * Clean up queue on shutdown
 */
async function cleanup() {
    console.log('🛑 Shutting down worker...');
    await worker.close();
    await deploymentQueue.close();
    await redisConnection.quit();
    console.log('✅ Worker shut down successfully');
}

// Handle graceful shutdown
process.on('SIGTERM', cleanup);
process.on('SIGINT', cleanup);

console.log('👷 [Worker] Queue worker initialized and ready');
console.log(`   ├─ Queue: ${QUEUE_NAME}`);
console.log(`   ├─ Redis: ${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`);
console.log(`   └─ Concurrency: 1 job at a time`);

module.exports = { 
    addToQueue, 
    getQueueStats,
    deploymentQueue,
    worker
};