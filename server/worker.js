const { Worker } = require('bullmq');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
require('dotenv').config();

const connection = {
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  password: process.env.REDIS_PASSWORD,
  tls: {},
};

function runCodeInDocker(code) {
  return new Promise((resolve, reject) => {
    // Step 1: Write the code to a temporary file
    const fileName = `temp-${Date.now()}.js`;
    const filePath = path.join(__dirname, 'temp', fileName);

    // Make sure the temp folder exists
    if (!fs.existsSync(path.join(__dirname, 'temp'))) {
      fs.mkdirSync(path.join(__dirname, 'temp'));
    }

    fs.writeFileSync(filePath, code);

    // Step 2: Build the docker command
    const dockerCommand = `docker run --rm --network none --memory=100m --cpus=0.5 -v "${filePath}:/app/code.js" node:20-alpine node /app/code.js`;

    // Step 3: Run it, with a hard timeout
    exec(dockerCommand, { timeout: 5000 }, (error, stdout, stderr) => {
      // Step 4: Clean up the temp file no matter what happens
      fs.unlinkSync(filePath);

      if (error) {
        if (error.killed) {
          resolve({ success: false, output: 'Execution timed out (5 second limit)' });
        } else {
          resolve({ success: false, output: stderr || error.message });
        }
        return;
      }

      resolve({ success: true, output: stdout });
    });
  });
}

const worker = new Worker(
  'code-execution',
  async (job) => {
    console.log('Worker picked up job:', job.id);
    const { code } = job.data;

    const result = await runCodeInDocker(code);

    console.log('Execution result:', result);
    return result;
  },
  { connection }
);

worker.on('completed', (job) => {
  console.log(`✅ Job ${job.id} completed`);
});

worker.on('failed', (job, err) => {
  console.log(`❌ Job ${job.id} failed:`, err.message);
});