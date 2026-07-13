require('dotenv').config();
const connectDB = require('./db');
connectDB();

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { QueueEvents } = require('bullmq');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const codeExecutionQueue = require('./queue');
const authRoutes = require('./routes/auth');
const sessionRoutes = require('./routes/sessions');
const Session = require('./models/Session');

const app = express();
const server = http.createServer(app);

// Core middleware — must come before any routes that need them
app.use(cors());
app.use(express.json());

// Routes
app.get('/', (req, res) => {
  res.send('Server is running');
});
app.use('/api/auth', authRoutes);
app.use('/api/sessions', sessionRoutes);

// Attach Socket.io to our existing HTTP server
const io = new Server(server, {
  cors: {
    origin: "*"
  }
});

io.use((socket, next) => {
  const token = socket.handshake.auth.token;

  if (!token) {
    return next(new Error('Authentication error: no token provided'));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.userId;
    next();
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

const queueEvents = new QueueEvents('code-execution', { connection });

queueEvents.on('completed', async ({ jobId, returnvalue }) => {
  const job = await codeExecutionQueue.getJob(jobId);
  const room = job.data.room;

  console.log(`Job ${jobId} completed, sending result to room ${room}`);
  io.to(room).emit('code-result', returnvalue);
});

// Tracks pending debounced database saves, keyed by room — shared across all connections
const saveTimers = {};

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('join-room', async (roomName) => {
    socket.join(roomName);
    console.log(`Socket ${socket.id} joined room: ${roomName}`);

    try {
      const session = await Session.findOne({ roomId: roomName });
      if (session) {
        socket.emit('load-code', session.code);
      }
    } catch (err) {
      console.error('Failed to load session code:', err);
    }
  });

  socket.on('send-message', (data) => {
    io.to(data.room).emit('receive-message', data.message);
  });

  socket.on('send-code-change', (data) => {
    io.to(data.room).emit('receive-code-change', data.code);

    // Debounced database save — separate from the broadcast above
    if (saveTimers[data.room]) {
      clearTimeout(saveTimers[data.room]);
    }

    saveTimers[data.room] = setTimeout(async () => {
      try {
        await Session.findOneAndUpdate(
          { roomId: data.room },
          { code: data.code }
        );
        console.log(`Saved code for room ${data.room}`);
      } catch (err) {
        console.error('Failed to save code:', err);
      }
    }, 5000);
  });

socket.on('run-code', async (data) => {
  console.log('Run code requested for room:', data.room);
  const job = await codeExecutionQueue.add('run-code', {
    code: data.code,
    room: data.room,
    language: data.language,
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