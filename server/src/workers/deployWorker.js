const { Queue, Worker } = require('bullmq');
const IORedis = require('ioredis');
const Deployment = require('../models/DeploymentModel');

const deployContainerToEC2 = require("../services/ec2Service");
const invokeLambda = require("../services/lambdaService");

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
 * Update deployment status in database
 */
async function updateDeploymentStatus(
    id,
    status,
    errorMessage = '',
    containerId = '',
    containerPort = null
) {
    const updateData = {
        status,
        updatedAt: new Date()
    };

    if (errorMessage) {
        updateData.errorMessage = errorMessage;
    }

    if (containerId) {
        updateData.containerId = containerId;
    }

    if (containerPort !== null && containerPort !== undefined) {
        updateData.containerPort = containerPort;
    }

    return await Deployment.findByIdAndUpdate(
        id,
        updateData,
        { new: true }
    );
}

/**
 * Worker: Process deployment jobs
 */
const worker = new Worker(
    QUEUE_NAME,

    async (job) => {

        const { deploymentId } = job.data;

        console.log(`\n🚀 [Worker] Processing deployment: ${deploymentId}`);
        console.log(`   ├─ Job ID: ${job.id}`);
        console.log(`   ├─ Attempt: ${job.attemptsMade + 1}/${job.opts.attempts}`);

        try {

            /**
             * STEP 1
             * Update deployment status
             */
            await updateDeploymentStatus(
                deploymentId,
                'Processing'
            );

            console.log(`📝 [Worker] Status updated: Pending → Processing`);

            /**
             * STEP 2
             * Get deployment details
             */
            const deployment = await Deployment.findById(deploymentId);

            if (!deployment) {
                throw new Error('Deployment not found in database');
            }

            console.log(`📋 [Worker] Deployment details:`);
            console.log(`   ├─ Client: ${deployment.clientName}`);
            console.log(`   ├─ Domain: ${deployment.domain}`);
            console.log(`   └─ Image: ${deployment.image}`);

            /**
             * STEP 3
             * Deploy Docker container on EC2
             */
            console.log(`\n📦 [Worker] Step 1/2: Deploying Docker container...`);

            const dockerResult = await deployContainerToEC2({
                clientName: deployment.clientName,
                image: deployment.image,
                domain: deployment.domain,
            });

            if (!dockerResult.success) {
                throw new Error(
                    dockerResult.error || 'Docker deployment failed'
                );
            }

            console.log(`✅ [Worker] Docker deployment successful`);

            /**
             * Save container ID
             */
            await updateDeploymentStatus(
                deploymentId,
                'Processing',
                '',
                dockerResult.containerId,
                dockerResult.containerPort
            );

            /**
             * STEP 4
             * Trigger AWS Lambda
             */
            console.log(`\n⚡ [Worker] Step 2/2: Triggering Lambda function...`);

            const lambdaResult = await invokeLambda({
                deploymentId,
                clientName: deployment.clientName,
                domain: deployment.domain,
                image: deployment.image,
                containerId: dockerResult.containerId,
                containerPort: dockerResult.containerPort
            });

            console.log(`✅ [Worker] Lambda invoked successfully`);

            if (!lambdaResult.StatusCode) {
                throw new Error('Lambda invocation failed');
            }

            /**
             * STEP 5
             * Mark deployment completed
             */
            await updateDeploymentStatus(
                deploymentId,
                'Completed'
            );

            console.log(`\n✅ [Worker] Deployment completed successfully!`);
            console.log(`   ├─ Deployment ID: ${deploymentId}`);
            console.log(`   ├─ Container ID: ${dockerResult.containerId}`);
            console.log(`   └─ Lambda Status: ${lambdaResult.StatusCode}`);

            return {
                success: true,
                deploymentId,
                containerId: dockerResult.containerId,
                containerPort: dockerResult.containerPort,
                lambdaStatus: lambdaResult.StatusCode
            };

        } catch (error) {

            console.error(`\n❌ [Worker] Deployment failed:`);
            console.error(error);

            /**
             * Update status to failed
             */
            await updateDeploymentStatus(
                deploymentId,
                'Failed',
                error.message
            );

            throw error;
        }
    },

    {
        connection: redisConnection,

        concurrency: 1,

        limiter: {
            max: 1,
            duration: 1000
        }
    }
);

// Worker event handlers
worker.on('completed', (job) => {
    console.log(`🎉 [Worker] Job ${job.id} completed successfully`);
});

worker.on('failed', (job, err) => {
    console.error(`💥 [Worker] Job ${job?.id} failed:`, err.message);
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

    const job = await deploymentQueue.add(
        'deploy-task',

        {
            deploymentId,
            createdAt: new Date().toISOString()
        },

        {
            priority: 1,
            delay: 0
        }
    );

    console.log(
        `📥 [Queue] Added job ${job.id} for deployment ${deploymentId}`
    );

    return job;
}

/**
 * Get queue statistics
 */
async function getQueueStats() {

    const [
        waiting,
        active,
        completed,
        failed
    ] = await Promise.all([
        deploymentQueue.getWaitingCount(),
        deploymentQueue.getActiveCount(),
        deploymentQueue.getCompletedCount(),
        deploymentQueue.getFailedCount()
    ]);

    return {
        waiting,
        active,
        completed,
        failed
    };
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

// Graceful shutdown
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