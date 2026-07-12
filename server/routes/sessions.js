const express = require('express');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const Session = require('../models/Session');

const router = express.Router();

// Middleware: verify JWT for these routes
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token' });
  }
}

router.post('/create', requireAuth, async (req, res) => {
  try {
    const roomId = crypto.randomBytes(6).toString('hex');

    const session = await Session.create({
      roomId,
      createdBy: req.userId,
    });

    res.status(201).json({ roomId: session.roomId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;