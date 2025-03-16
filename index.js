const express = require('express');
// const rateLimit = require('express-rate-limit');
// const slowDown = require('express-slow-down');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const cluster = require('cluster');
const os = require('os');
const path = require("path");

const app = express();
// app.set('trust proxy', true); // Trust all proxies (better for production cloud environments)
// const blockedIPs = new Set(); // Disabled for now
const PORT = process.env.SERVER_PORT || 3001;

// Security Headers
app.use(helmet());

// Enable CORS
app.use(cors());

// Parse JSON and URL-encoded payloads
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Enable response compression
app.use(compression());

// ======= Rate Limiting Disabled =======
// const limiter = rateLimit({
//     windowMs: 1 * 60 * 1000, // 1 minute
//     max: 100, // Allow 100 requests per IP
//     handler: (req, res) => {
//         blockedIPs.add(req.ip);
//         res.status(429).send("Too many requests, you are temporarily blocked.");
//     }
// });
// app.use(limiter);

// ======= Slow Down Disabled =======
// const speedLimiter = slowDown({
//     windowMs: 60 * 1000, // 1 minute
//     delayAfter: 50, // Allow 50 requests per minute
//     delayMs: (used, req) => {
//         const delayAfter = req.slowDown.limit;
//         return (used - delayAfter) * 500;
//     }
// });
// app.use(speedLimiter);

// ======= IP Blocking Disabled =======
// app.use((req, res, next) => {
//     if (blockedIPs.has(req.ip)) {
//         return res.status(403).send("You are blocked.");
//     }
//     next();
// });

// Log IP for debugging (optional, can be removed later)
app.use((req, res, next) => {
    console.log("Request IP:", req.ip);
    next();
});

const userRoutes = require('./routes/userRoutes');

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, "public")));

// Serve index.html for the root route
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

// User API routes
app.use("/api", userRoutes);

// 404 Error Handling - Redirect to 404.html
app.use((req, res) => {
    res.status(404).sendFile(path.join(__dirname, "public", "404.html"));
});

// Enable Clustering for Multi-Core Usage
if (cluster.isMaster) {
    const numCPUs = os.cpus().length;
    console.log(`Master process running on PID ${process.pid}`);

    for (let i = 0; i < numCPUs; i++) {
        cluster.fork();
    }

    cluster.on('exit', (worker) => {
        console.log(`Worker ${worker.process.pid} died, restarting...`);
        cluster.fork();
    });
} else {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}, Worker PID: ${process.pid}`);
    });
}
