require('dotenv').config();

const path = require('path');
const http = require('http');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { Server: SocketIOServer } = require('socket.io');

const authRoutes = require('./routes/auth');
const whitelistRoutes = require('./routes/whitelist');
const productRoutes = require('./routes/products');
const orderRoutes = require('./routes/orders');
const attachLocationSocket = require('./sockets/location');

const app = express();

// --- Security middleware -------------------------------------------------
// Default helmet CSP blocks inline <script> tags. This app's frontend
// scripts live in separate .js files (never inline), so the default
// 'self' policy for scripts works. We additionally allow the map tiles
// (OpenStreetMap) and the Leaflet library from a CDN.
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", 'https://unpkg.com'],
        styleSrc: ["'self'", 'https://unpkg.com'],
        imgSrc: ["'self'", 'data:', 'https://*.tile.openstreetmap.org'],
        connectSrc: ["'self'"],
      },
    },
  })
);
app.use(
  cors({
    origin: (process.env.CORS_ORIGIN || 'http://localhost:3000').split(','),
    credentials: true,
  })
);
app.disable('x-powered-by');
app.use(express.json({ limit: '100kb' })); // cap body size
app.use(cookieParser());

// --- API routes -----------------------------------------------------------
app.use('/api/auth', authRoutes);
app.use('/api/whitelist', whitelistRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);

// --- Static frontend --------------------------------------------------
app.use(express.static(path.join(__dirname, '..', 'public')));

// --- Fallback error handler (never leak stack traces to clients) ------
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Something went wrong.' });
});

const PORT = process.env.PORT || 3000;

// Use a raw http server (instead of app.listen) so socket.io can share
// the same port for the live-location WebSocket connections.
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: (process.env.CORS_ORIGIN || 'http://localhost:3000').split(','),
    credentials: true,
  },
});
attachLocationSocket(io);
app.set('io', io); // lets REST routes (e.g. order status changes) broadcast over sockets

server.listen(PORT, () => {
  console.log(`One-seller app listening on http://localhost:${PORT}`);
});
