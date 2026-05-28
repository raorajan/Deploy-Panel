const { Queue } = require("bullmq");
const IORedis = require("ioredis");

const connection = new IORedis({
  maxRetriesPerRequest: null,
});

const deployQueue = new Queue("deployments", {
  connection,
});

module.exports = deployQueue;