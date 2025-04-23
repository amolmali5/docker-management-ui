"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const express_session_1 = __importDefault(require("express-session"));
const dockerode_1 = __importDefault(require("dockerode"));
const path_1 = __importDefault(require("path"));
// Initialize Docker client
const docker = new dockerode_1.default();
// Create Express app
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
// Middleware
app.use((0, cors_1.default)({
    origin: process.env.NODE_ENV === 'production' ? false : 'http://localhost:3000',
    credentials: true
}));
app.use(express_1.default.json());
app.use((0, cookie_parser_1.default)());
app.use((0, express_session_1.default)({
    secret: 'docker-management-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));
// API Routes
// Get all containers
app.get('/api/containers', (req, res) => {
    docker.listContainers({ all: true })
        .then(containers => {
        res.json(containers);
    })
        .catch(error => {
        console.error('Error fetching containers:', error);
        res.status(500).json({ error: 'Failed to fetch containers' });
    });
});
// Get container details
app.get('/api/containers/:id', (req, res) => {
    const container = docker.getContainer(req.params.id);
    container.inspect()
        .then(info => {
        res.json(info);
    })
        .catch(error => {
        console.error(`Error fetching container ${req.params.id}:`, error);
        res.status(500).json({ error: `Failed to fetch container ${req.params.id}` });
    });
});
// Get container logs
app.get('/api/containers/:id/logs', (req, res) => {
    const container = docker.getContainer(req.params.id);
    container.logs({
        stdout: true,
        stderr: true,
        tail: 100,
        follow: false
    })
        .then(logs => {
        // Convert Buffer to string
        const logsString = logs.toString('utf8');
        res.send(logsString);
    })
        .catch(error => {
        console.error(`Error fetching logs for container ${req.params.id}:`, error);
        res.status(500).json({ error: `Failed to fetch logs for container ${req.params.id}` });
    });
});
// Get container stats
app.get('/api/containers/:id/stats', (req, res) => {
    const container = docker.getContainer(req.params.id);
    container.stats({ stream: false })
        .then(stats => {
        res.json(stats);
    })
        .catch(error => {
        console.error(`Error fetching stats for container ${req.params.id}:`, error);
        res.status(500).json({ error: `Failed to fetch stats for container ${req.params.id}` });
    });
});
// Start container
app.post('/api/containers/:id/start', (req, res) => {
    const container = docker.getContainer(req.params.id);
    container.start()
        .then(() => {
        res.json({ success: true });
    })
        .catch(error => {
        console.error(`Error starting container ${req.params.id}:`, error);
        res.status(500).json({ error: `Failed to start container ${req.params.id}` });
    });
});
// Stop container
app.post('/api/containers/:id/stop', (req, res) => {
    const container = docker.getContainer(req.params.id);
    container.stop()
        .then(() => {
        res.json({ success: true });
    })
        .catch(error => {
        console.error(`Error stopping container ${req.params.id}:`, error);
        res.status(500).json({ error: `Failed to stop container ${req.params.id}` });
    });
});
// Restart container
app.post('/api/containers/:id/restart', (req, res) => {
    const container = docker.getContainer(req.params.id);
    container.restart()
        .then(() => {
        res.json({ success: true });
    })
        .catch(error => {
        console.error(`Error restarting container ${req.params.id}:`, error);
        res.status(500).json({ error: `Failed to restart container ${req.params.id}` });
    });
});
// Update container environment variables
app.post('/api/containers/:id/update-env', (req, res) => {
    const { id } = req.params;
    const { env } = req.body;
    if (!env || !Array.isArray(env)) {
        return res.status(400).json({ error: 'Invalid environment variables format' });
    }
    // Get the current container
    const container = docker.getContainer(id);
    container.inspect()
        .then(containerInfo => {
        // We need to create a new container with the updated env vars
        // First, stop the current container if it's running
        const stopPromise = containerInfo.State.Running ? container.stop() : Promise.resolve();
        return stopPromise
            .then(() => container.remove({ v: false }))
            .then(() => {
            // Create a new container with the same config but updated env vars
            return docker.createContainer(Object.assign(Object.assign({}, containerInfo.Config), { name: containerInfo.Name.replace('/', ''), Env: env, HostConfig: containerInfo.HostConfig }));
        })
            .then(newContainer => {
            // Start the new container
            return newContainer.start()
                .then(() => {
                res.json({ success: true, id: newContainer.id });
            });
        });
    })
        .catch(error => {
        console.error(`Error updating environment variables for container ${id}:`, error);
        res.status(500).json({ error: `Failed to update environment variables for container ${id}` });
    });
});
// Get all images
app.get('/api/images', (req, res) => {
    docker.listImages()
        .then(images => {
        res.json(images);
    })
        .catch(error => {
        console.error('Error fetching images:', error);
        res.status(500).json({ error: 'Failed to fetch images' });
    });
});
// Get Docker system info
app.get('/api/system/info', (req, res) => {
    docker.info()
        .then(info => {
        res.json(info);
    })
        .catch(error => {
        console.error('Error fetching system info:', error);
        res.status(500).json({ error: 'Failed to fetch system info' });
    });
});
// Get Docker version
app.get('/api/system/version', (req, res) => {
    docker.version()
        .then(version => {
        res.json(version);
    })
        .catch(error => {
        console.error('Error fetching Docker version:', error);
        res.status(500).json({ error: 'Failed to fetch Docker version' });
    });
});
// Serve static files in production
if (process.env.NODE_ENV === 'production') {
    app.use(express_1.default.static(path_1.default.join(__dirname, '../out')));
    app.get('*', (req, res) => {
        res.sendFile(path_1.default.join(__dirname, '../out/index.html'));
    });
}
// Start the server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
exports.default = app;
