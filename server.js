require('dotenv').config();

const cors = require('cors');
const express = require('express');
const routes = require('./src/routes');

// API Server
const app = express();

const corsOptions = {
  origin: '*',                                          // Chỉ định origin cụ thể hoặc '*' cho tất cả
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // Cho phép các method cần thiết
  allowedHeaders: ['Content-Type', 'Authorization'],    // Cho phép các header client gửi
  credentials: true,                                    // Cho phép gửi cookie/credentials (nếu cần)
  preflightContinue: false,                             // Ngăn server tự động trả về response cho OPTIONS
  optionsSuccessStatus: 204,                            // Trả về 204 No Content cho preflight
  maxAge: 86400,                                        // Cache preflight request trong 24h để giảm số lượng request OPTIONS
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middleware timeout cho route cụ thể
const setRouteTimeout = (req, res, next) => {
  res.setTimeout(300000, () => {
    res.status(408).json({ error: 'Request Timeout after 5 minutes' });
  });
  next();
};

// Routes
app.use('/api', setRouteTimeout, routes);

// Logger
// const logger = winston.createLogger({
//   level: 'info',
//   format: winston.format.json(),
//   transports: [
//     new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
//     new winston.transports.File({ filename: 'logs/combined.log' }),
//   ],
// });

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n**** Server running on port ${PORT}`);
});