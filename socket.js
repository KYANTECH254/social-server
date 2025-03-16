const cluster = require('cluster');
const http = require('http');
const os = require('os');
const socketIo = require('socket.io');
const express = require('express');
const rateLimit = require('express-rate-limit');

const PORT = process.env.SOCKET_PORT || 3002;
const numCPUs = os.cpus().length;

if (cluster.isMaster) {
    console.log(`Master process running on PID ${process.pid}`);

    for (let i = 0; i < numCPUs; i++) {
        cluster.fork();
    }

    cluster.on('exit', (worker) => {
        console.log(`Worker ${worker.process.pid} died, restarting...`);
        cluster.fork();
    });
} else {
    const app = express();
    const server = http.createServer(app);
    const io = socketIo(server, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"]
        }
    });

    // Rate limiter for WebSocket messages
    const messageLimiter = rateLimit({
        windowMs: 60 * 1000, 
        max: 100, 
        handler: (req, res) => res.status(429).send("Too many messages sent. Slow down!")
    });

    app.use(messageLimiter);

    io.on('connection', (socket) => {
        console.log(`New client connected: ${socket.id}`);
        
        socket.on('message', (msg) => {
            console.log(`Message received from ${socket.id}:`, msg);
            io.emit('message', msg);
        });

        socket.on('disconnect', () => {
            console.log(`Client disconnected: ${socket.id}`);
        });
    });

    server.listen(PORT, () => {
        console.log(`Socket server running on port ${PORT}, Worker PID: ${process.pid}`);
    });
}
