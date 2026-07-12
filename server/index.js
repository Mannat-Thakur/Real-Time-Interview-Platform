require('dotenv').config();
const connectDB = require('./db');
connectDB();

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { QueueEvents } = require('bullmq');
const codeExecutionQueue = require('./queue');
const authRoutes = require('./routes/auth');

const app = express();
const server = http.createServer(app);
const cors = require('cors');

// ... after creating `app`

app.use(cors());
app.use(express.json());

// Attach Socket.io to our existing HTTP server
const io = new Server(server, {
  cors: {
    origin: "*" // we'll lock this down later, wide open for now just to test
  }
});

const jwt = require('jsonwebtoken');

io.use((socket, next) => {
  const token = socket.handshake.auth.token;

  if (!token) {
    return next(new Error('Authentication error: no token provided'));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.userId; // attach user info to this socket for later use
    next(); // allow the connection to proceed
  } catch (err) {
    next(new Error('Authentication error: invalid token'));
  }
});

// Redis connection config, used for QueueEvents below
const connection = {
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  password: process.env.REDIS_PASSWORD,
  tls: {},
};

// Listen for job completions from the worker, via Redis
const queueEvents = new QueueEvents('code-execution', { connection });

queueEvents.on('completed', async ({ jobId, returnvalue }) => {
  const job = await codeExecutionQueue.getJob(jobId);
  const room = job.data.room;

  console.log(`Job ${jobId} completed, sending result to room ${room}`);
  io.to(room).emit('code-result', returnvalue);
});

app.get('/', (req, res) => {
  res.send('Server is running');
});

 app.use(express.json());
app.use('/api/auth', authRoutes);

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('join-room', (roomName) => {
    socket.join(roomName);
    console.log(`Socket ${socket.id} joined room: ${roomName}`);
  });

  socket.on('send-message', (data) => {
    io.to(data.room).emit('receive-message', data.message);
  });

  socket.on('send-code-change', (data) => {
    io.to(data.room).emit('receive-code-change', data.code);
  });

  socket.on('run-code', async (data) => {
    console.log('Run code requested for room:', data.room);
    const job = await codeExecutionQueue.add('run-code', {
      code: data.code,
      room: data.room,
    });
    console.log('Job added:', job.id);
  });

  socket.on('disconnect', () => {
    console.log('A user disconnected:', socket.id);
  });
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});