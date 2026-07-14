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

const LANGUAGE_CONFIG = {
  javascript: {
    extension: 'js',
    image: 'node:20-alpine',
    command: (filename) => `node ${filename}`,
  },
  python: {
    extension: 'py',
    image: 'python:3.11-alpine',
    command: (filename) => `python3 ${filename}`,
  },
};

function runCodeInDocker(code, language, input = '') {
  return new Promise((resolve) => {
    const config = LANGUAGE_CONFIG[language];

    if (!config) {
      resolve({ success: false, output: `Unsupported language: ${language}` });
      return;
    }

    const fileName = `temp-${Date.now()}-${Math.random().toString(36).slice(2)}.${config.extension}`;
    const filePath = path.join(__dirname, 'temp', fileName);

    if (!fs.existsSync(path.join(__dirname, 'temp'))) {
      fs.mkdirSync(path.join(__dirname, 'temp'));
    }

    fs.writeFileSync(filePath, code);

    const containerFileName = `code.${config.extension}`;
    const runCommand = config.command(containerFileName);

    const dockerCommand = `docker run --rm -i --network none --memory=100m --cpus=0.5 -v "${filePath}:/app/${containerFileName}" -w /app ${config.image} ${runCommand}`;

    const child = exec(
      dockerCommand,
      { timeout: 5000, maxBuffer: 1024 * 1024 },
      (error, stdout, stderr) => {
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
      }
    );

    child.stdin.write(input);
    child.stdin.end();
  });
}

const worker = new Worker(
  'code-execution',
  async (job) => {
    console.log('Worker picked up job:', job.id);
    const { code, language, testCases } = job.data;

    if (!testCases || testCases.length === 0) {
      const result = await runCodeInDocker(code, language || 'javascript');
      return { mode: 'raw', ...result };
    }

    const results = [];
    for (const tc of testCases) {
      const result = await runCodeInDocker(code, language || 'javascript', tc.input);
      const actual = (result.output || '').trim();
      const expected = tc.expectedOutput.trim();
      results.push({
  passed: result.success && actual === expected,
  input: tc.input,
  expectedOutput: expected,
  actualOutput: result.success ? actual : result.output,
  isHidden: tc.isHidden,
});
    }

    return {
      mode: 'testcases',
      results,
      passedCount: results.filter((r) => r.passed).length,
      totalCount: results.length,
    };
  },
  { connection }
);

worker.on('completed', (job) => {
  console.log(`✅ Job ${job.id} completed`);
});

worker.on('failed', (job, err) => {
  console.log(`❌ Job ${job.id} failed:`, err.message);
});