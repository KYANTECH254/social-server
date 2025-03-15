import express from 'express';
import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import cluster from 'cluster';
import os from 'os';

const app = express();
const blockedIPs = new Set();
const PORT = process.env.PORT || 3001;

// Security Headers
app.use(helmet());

// Enable CORS for safe cross-origin requests
app.use(cors());

// Enable response compression
app.use(compression());

// Rate Limiting to prevent DDoS
const limiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 100, // Allow 100 requests per IP
    handler: (req, res) => {
        blockedIPs.add(req.ip);
        res.status(429).send("Too many requests, you are temporarily blocked.");
    }
});
app.use(limiter);

// Slow Down to prevent bot abuse
const speedLimiter = slowDown({
    windowMs: 60 * 1000, // 1 minute
    delayAfter: 50, // Allow 50 requests per minute
    delayMs: 500 // Delay subsequent requests
});
app.use(speedLimiter);

// Block abusive IPs
app.use((req, res, next) => {
    if (blockedIPs.has(req.ip)) {
        return res.status(403).send("You are blocked.");
    }
    next();
});

// Basic route
app.get('/', (req, res) => {
    res.send("Server is running");
});

// Enable Clustering for Multi-Core Usage
if (cluster.isPrimary) {
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
