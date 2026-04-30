require('dotenv').config();
const express    = require('express');
const http       = require('http');
const { Server } = require('socket.io');
const cors       = require('cors');
const helmet     = require('helmet');
const morgan     = require('morgan');

const app    = express();
const server = http.createServer(app);
const PORT   = process.env.PORT || 5000;

const allowedOrigins = [
  process.env.FRONTEND_URL,
  process.env.ADMIN_URL,
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000'
].filter(Boolean);

// ── Socket.IO ────────────────────────────────────────────────
const io = new Server(server, {
  cors: { origin: allowedOrigins, methods: ['GET','POST'], credentials: true },
  maxHttpBufferSize: 50 * 1024 * 1024  // 50MB for file transfers
});

// Make io accessible in routes
app.set('io', io);

// ── Middleware ───────────────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(morgan('dev'));
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Routes ───────────────────────────────────────────────────
app.use('/api/auth',          require('./routes/auth'));
app.use('/api/users',         require('./routes/users'));
app.use('/api/conversations', require('./routes/conversations'));
app.use('/api/messages',      require('./routes/messages'));
app.use('/api/media',         require('./routes/media'));
app.use('/api/admin',         require('./routes/admin'));

app.get('/health', (req, res) => res.json({ status: 'OK', timestamp: new Date() }));

// ── Socket.IO Handler ─────────────────────────────────────────
require('./sockets/chatSocket')(io);

// ── Error Handler ─────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});

server.listen(PORT, () => {
  console.log(`\n🚀 PrivaChat Backend running on port ${PORT}`);
  console.log(`🌍 Mode: ${process.env.NODE_ENV}`);
});
