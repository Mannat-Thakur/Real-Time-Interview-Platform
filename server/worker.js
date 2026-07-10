const { Worker } = require('bullmq');
require('dotenv').config();

const connection = {
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  password: process.env.REDIS_PASSWORD,
  tls: {},
};

const worker = new Worker(
  'code-execution',
  async (job) => {
    console.log('Worker picked up job:', job.id);
    console.log('Job data:', job.data);

    // Simulate "doing work" for now — real code execution comes next
    await new Promise((resolve) => setTimeout(resolve, 3000));

    console.log('Job finished:', job.id);
    return { output: 'This is a fake result for now' };
  },
  { connection }
);

worker.on('completed', (job) => {
  console.log(`✅ Job ${job.id} completed`);
});

worker.on('failed', (job, err) => {
  console.log(`❌ Job ${job.id} failed:`, err.message);
});