require("dotenv").config();
const connectDB = require("./db");
connectDB();

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { QueueEvents } = require("bullmq");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const codeExecutionQueue = require("./queue");
const authRoutes = require("./routes/auth");
const sessionRoutes = require("./routes/sessions");
const Session = require("./models/Session");
const User = require("./models/User");
const {
  sanitizeProblemForRole,
  sanitizeResultforRole,
} = require("./utils/sanitize");

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Server is running");
});
app.use("/api/auth", authRoutes);
app.use("/api/sessions", sessionRoutes);

const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

io.use(async (socket, next) => {
  const token = socket.handshake.auth.token;

  if (!token) {
    return next(new Error("Authentication error: no token provided"));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user) {
      return next(new Error("Authentication error: user not found"));
    }

    socket.userId = decoded.userId;
    socket.userName = user.name;
    next();
  } catch (err) {
    next(new Error("Authentication error: invalid token"));
  }
});

const connection = {
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  password: process.env.REDIS_PASSWORD,
  tls: {},
};

const queueEvents = new QueueEvents("code-execution", { connection });

queueEvents.on("completed", async ({ jobId, returnvalue }) => {
  const job = await codeExecutionQueue.getJob(jobId);
  const room = job.data.room;

  console.log(`Job ${jobId} completed, sending result to room ${room}`);

  const socketsInRoom = await io.in(room).fetchSockets();
  for (const s of socketsInRoom) {
    s.emit("code-result", sanitizeResultForRole(returnvalue, s.role));
  }
});

const saveTimers = {};
const roomUsers = {};

io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  socket.on("join-room", async (roomName) => {
    socket.join(roomName);
    socket.currentRoom = roomName;
    console.log(`Socket ${socket.id} joined room: ${roomName}`);

    if (!roomUsers[roomName]) {
      roomUsers[roomName] = {};
    }
    roomUsers[roomName][socket.id] = socket.userName;
    io.to(roomName).emit("room-users", Object.values(roomUsers[roomName]));

    try {
      const session = await Session.findOne({ roomId: roomName }).populate(
        "problem",
      );
      if (!session) return;

      let role = "observer";
      if (String(session.createdBy) === String(socket.userId)) {
        role = "interviewer";
      } else if (
        session.candidate &&
        String(session.candidate) === String(socket.userId)
      ) {
        role = "candidate";
      } else if (!session.candidate) {
        session.candidate = socket.userId;
        session.status = "active";
        await session.save();
        role = "candidate";
      }

      socket.role = role; // remember this socket's role for later use (e.g. run-code)

      socket.emit("session-info", {
        role,
        problem: sanitizeProblemForRole(session.problem, role),
        status: session.status,
      });

      if (session.code) {
        socket.emit("load-code", session.code);
      }
    } catch (err) {
      console.error("Failed to load session:", err);
    }
  });

  socket.on("send-message", (data) => {
    io.to(data.room).emit("receive-message", {
      user: socket.userName,
      message: data.message,
    });
  });

  socket.on("send-code-change", (data) => {
    io.to(data.room).emit("receive-code-change", data.code);

    if (saveTimers[data.room]) {
      clearTimeout(saveTimers[data.room]);
    }

    saveTimers[data.room] = setTimeout(async () => {
      try {
        await Session.findOneAndUpdate(
          { roomId: data.room },
          { code: data.code },
        );
        console.log(`Saved code for room ${data.room}`);
      } catch (err) {
        console.error("Failed to save code:", err);
      }
    }, 5000);
  });

  socket.on("send-language-change", (data) => {
    socket.to(data.room).emit("receive-language-change", data.language);
  });

  socket.on("run-code", async (data) => {
    console.log("Run code requested for room:", data.room);
    try {
      const session = await Session.findOne({ roomId: data.room }).populate(
        "problem",
      );
      const testCases = session?.problem?.testCases || [];

      const job = await codeExecutionQueue.add("run-code", {
        code: data.code,
        room: data.room,
        language: data.language,
        testCases,
      });
      console.log("Job added:", job.id);
    } catch (err) {
      console.error("Failed to queue run-code:", err);
    }
  });

  socket.on("cursor-move", (data) => {
    socket.to(data.room).emit("receive-cursor", {
      userId: socket.id,
      userName: socket.userName,
      position: data.position,
    });
  });

  socket.on("end-interview", async (data) => {
    try {
      const session = await Session.findOne({ roomId: data.room });
      if (!session || String(session.createdBy) !== String(socket.userId))
        return;

      session.status = "completed";
      session.endedAt = new Date();
      await session.save();

      const socketsInRoom = await io.in(data.room).fetchSockets();
      for (const s of socketsInRoom) {
        if (String(s.userId) !== String(socket.userId)) {
          s.emit("interview-ended");
        } else {
          s.emit("interview-ended-self");
        }
      }
    } catch (err) {
      console.error("Failed to end interview:", err);
    }
  });

  socket.on("disconnect", () => {
    console.log("A user disconnected:", socket.id);

    if (socket.currentRoom && roomUsers[socket.currentRoom]) {
      delete roomUsers[socket.currentRoom][socket.id];
      io.to(socket.currentRoom).emit(
        "room-users",
        Object.values(roomUsers[socket.currentRoom]),
      );
      io.to(socket.currentRoom).emit("user-left", { userId: socket.id });
    }
  });
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
