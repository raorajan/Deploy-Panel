const Redis = require('ioredis');

const redisUrl = 'redis://default:unjy3ubJfeaRC84ziqd9228FJEBqQCt1@kitty-income-cider-70209.db.redis.io:11630';

const redis = new Redis(redisUrl, {
    maxRetriesPerRequest: null,
    connectTimeout: 10000
});

async function test() {
    console.log('🔌 Connecting to cloud Redis...');
    
    try {
        const pong = await redis.ping();
        console.log('✅ Connected! Response:', pong);
        console.log('🎉 Cloud Redis is working!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Connection failed:', err.message);
        process.exit(1);
    }
}

test();