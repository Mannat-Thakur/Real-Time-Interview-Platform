const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

// Attach Socket.io to our existing HTTP server
const io = new Server(server, {
  cors: {
    origin: "*" // we'll lock this down later, wide open for now just to test
  }
});

app.get('/', (req, res) => {
  res.send('Server is running');
});

// This is the core of Socket.io: listen for new connections
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('disconnect', () => {
    console.log('A user disconnected:', socket.id);
  });
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});