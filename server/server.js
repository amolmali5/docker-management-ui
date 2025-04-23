const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const Dockerode = require('dockerode');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');

// Import database and routes
const { initializeDb } = require('./db');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const settingsRoutes = require('./routes/settings');

// Import middleware
const { auth, adminAuth, writeAuth } = require('./middleware/auth');

// Initialize Docker client
const docker = new Dockerode();

// Create Express app
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true
  }
});
const PORT = process.env.PORT || 3001;

// Initialize database
initializeDb().catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});

// Middleware
app.use(cors({
  origin: 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-auth-token'],
  credentials: true
}));

// Add headers to all responses
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'http://localhost:3000');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, x-auth-token');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Credentials', 'true');
  next();
});
app.use(express.json());
app.use(cookieParser());
app.use(session({
  secret: 'docker-management-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// API Routes
// Register auth, user, and settings routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/settings', settingsRoutes);

// Docker API Routes
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

      // If container doesn't exist, return a 404 status with a clear message
      if (error.statusCode === 404) {
        return res.status(404).json({
          error: `Container not found: ${req.params.id}`,
          code: 'CONTAINER_NOT_FOUND',
          message: 'The container you are looking for no longer exists. It may have been removed.'
        });
      }

      // For other errors, return a 500 status
      res.status(500).json({
        error: `Failed to fetch container ${req.params.id}`,
        details: error.message || 'Unknown error'
      });
    });
});

// Get container logs
app.get('/api/containers/:id/logs', (req, res) => {
  const container = docker.getContainer(req.params.id);

  // First check if the container exists
  container.inspect()
    .then(() => {
      // Container exists, get logs
      return container.logs({
        stdout: true,
        stderr: true,
        tail: 100,
        follow: false
      });
    })
    .then(logs => {
      // Convert Buffer to string
      const logsString = logs.toString('utf8');
      res.send(logsString);
    })
    .catch(error => {
      console.error(`Error fetching logs for container ${req.params.id}:`, error);

      // If container doesn't exist, return empty logs instead of error
      if (error.statusCode === 404) {
        return res.send('');
      }

      // For other errors, return error response
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
app.post('/api/containers/:id/start', writeAuth, (req, res) => {
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
app.post('/api/containers/:id/stop', writeAuth, (req, res) => {
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

// Delete container
app.delete('/api/containers/:id', writeAuth, (req, res) => {
  const container = docker.getContainer(req.params.id);
  const force = req.query.force === 'true';

  container.remove({ force: force })
    .then(() => {
      res.json({ success: true, message: `Container ${req.params.id} deleted successfully` });
    })
    .catch(error => {
      console.error(`Error deleting container ${req.params.id}:`, error);
      res.status(500).json({
        error: `Failed to delete container ${req.params.id}`,
        details: error.json?.message || error.message || 'Unknown error'
      });
    });
});

// Restart container
app.post('/api/containers/:id/restart', writeAuth, (req, res) => {
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

// Execute command in container
app.post('/api/containers/:id/exec', writeAuth, (req, res) => {
  const { id } = req.params;
  const { command } = req.body;

  if (!command || !Array.isArray(command) || command.length === 0) {
    return res.status(400).json({ error: 'Invalid command format. Expected non-empty array.' });
  }

  const container = docker.getContainer(id);

  // Check if container is running
  container.inspect()
    .then(info => {
      if (!info.State.Running) {
        return res.status(400).json({ error: 'Container is not running' });
      }

      // Check if this is a shell command (no arguments)
      const isShellCommand = command.length === 1 && (command[0] === '/bin/sh' || command[0] === '/bin/bash');

      // Create exec instance
      return container.exec({
        Cmd: command,
        AttachStdout: true,
        AttachStderr: true,
        Tty: isShellCommand, // Use TTY only for shell commands
        AttachStdin: isShellCommand // Attach stdin for interactive shells
      });
    })
    .then(exec => {
      // Start exec instance
      return exec.start({ hijack: false });
    })
    .then(stream => {
      // Collect output
      let output = '';
      stream.on('data', chunk => {
        output += chunk.toString('utf8');
      });

      // Return output when stream ends
      stream.on('end', () => {
        res.json({ success: true, output });
      });

      // Handle errors
      stream.on('error', err => {
        console.error(`Error in exec stream for container ${id}:`, err);
        res.status(500).json({ error: `Error executing command in container ${id}` });
      });
    })
    .catch(error => {
      console.error(`Error executing command in container ${id}:`, error);
      res.status(500).json({
        error: `Failed to execute command in container ${id}`,
        details: error.json?.message || error.message || 'Unknown error'
      });
    });
});

// Update container environment variables
app.post('/api/containers/:id/update-env', writeAuth, (req, res) => {
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
          // Extract only the necessary configuration properties
          const containerConfig = {
            Image: containerInfo.Config.Image,
            Cmd: containerInfo.Config.Cmd,
            Entrypoint: containerInfo.Config.Entrypoint,
            ExposedPorts: containerInfo.Config.ExposedPorts,
            WorkingDir: containerInfo.Config.WorkingDir,
            name: containerInfo.Name.replace('/', ''),
            Env: env,
            Labels: containerInfo.Config.Labels,
            // Use the host config for volumes, ports, etc.
            HostConfig: {
              Binds: containerInfo.HostConfig.Binds,
              PortBindings: containerInfo.HostConfig.PortBindings,
              RestartPolicy: containerInfo.HostConfig.RestartPolicy,
              NetworkMode: containerInfo.HostConfig.NetworkMode,
              Privileged: containerInfo.HostConfig.Privileged,
              Devices: containerInfo.HostConfig.Devices,
              VolumesFrom: containerInfo.HostConfig.VolumesFrom
            }
          };

          return docker.createContainer(containerConfig);
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
      // Provide more detailed error information
      const errorMessage = error.json && error.json.message
        ? error.json.message
        : `Failed to update environment variables for container ${id}`;

      res.status(500).json({
        error: errorMessage,
        details: error.message || 'Unknown error'
      });
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

// Get image details
app.get('/api/images/:id', (req, res) => {
  const image = docker.getImage(req.params.id);
  image.inspect()
    .then(info => {
      res.json(info);
    })
    .catch(error => {
      console.error(`Error fetching image ${req.params.id}:`, error);
      res.status(500).json({
        error: `Failed to fetch image ${req.params.id}`,
        details: error.message || 'Unknown error'
      });
    });
});

// Delete an image
app.delete('/api/images/:id', writeAuth, (req, res) => {
  const image = docker.getImage(req.params.id);
  const force = req.query.force === 'true';
  const noprune = req.query.noprune === 'true';

  image.remove({ force, noprune })
    .then(() => {
      res.json({ success: true, message: `Image ${req.params.id} deleted successfully` });
    })
    .catch(error => {
      console.error(`Error deleting image ${req.params.id}:`, error);
      res.status(500).json({
        error: `Failed to delete image ${req.params.id}`,
        details: error.json?.message || error.message || 'Unknown error'
      });
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

// Get all networks
app.get('/api/networks', (req, res) => {
  docker.listNetworks()
    .then(async networks => {
      try {
        // Get detailed information for each network
        const detailedNetworks = await Promise.all(
          networks.map(async network => {
            try {
              const networkObj = docker.getNetwork(network.Id);
              const inspectInfo = await networkObj.inspect();
              return inspectInfo;
            } catch (inspectError) {
              console.error(`Error inspecting network ${network.Id}:`, inspectError);
              return network; // Return the original network object if inspection fails
            }
          })
        );
        res.json(detailedNetworks);
      } catch (err) {
        console.error('Error getting detailed network information:', err);
        res.json(networks); // Fall back to the basic network list
      }
    })
    .catch(error => {
      console.error('Error fetching networks:', error);
      res.status(500).json({ error: 'Failed to fetch networks' });
    });
});

// Get network details
app.get('/api/networks/:id', (req, res) => {
  const network = docker.getNetwork(req.params.id);
  network.inspect()
    .then(info => {
      res.json(info);
    })
    .catch(error => {
      console.error(`Error fetching network ${req.params.id}:`, error);
      res.status(500).json({
        error: `Failed to fetch network ${req.params.id}`,
        details: error.message || 'Unknown error'
      });
    });
});

// Create a network
app.post('/api/networks', writeAuth, (req, res) => {
  const { name, driver, subnet, gateway, internal } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Network name is required' });
  }

  const options = {
    Name: name,
    Driver: driver || 'bridge',
    Internal: internal || false,
    CheckDuplicate: true,
    IPAM: {
      Driver: 'default',
      Config: []
    }
  };

  // Add subnet and gateway if provided
  if (subnet) {
    const ipamConfig = { Subnet: subnet };
    if (gateway) {
      ipamConfig.Gateway = gateway;
    }
    options.IPAM.Config.push(ipamConfig);
  }

  docker.createNetwork(options)
    .then(network => {
      res.status(201).json(network);
    })
    .catch(error => {
      console.error('Error creating network:', error);
      res.status(500).json({
        error: 'Failed to create network',
        details: error.json?.message || error.message || 'Unknown error'
      });
    });
});

// Delete a network
app.delete('/api/networks/:id', writeAuth, (req, res) => {
  const network = docker.getNetwork(req.params.id);

  network.remove()
    .then(() => {
      res.json({ success: true, message: `Network ${req.params.id} deleted successfully` });
    })
    .catch(error => {
      console.error(`Error deleting network ${req.params.id}:`, error);
      res.status(500).json({
        error: `Failed to delete network ${req.params.id}`,
        details: error.json?.message || error.message || 'Unknown error'
      });
    });
});

// Get all volumes
app.get('/api/volumes', (req, res) => {
  docker.listVolumes()
    .then(volumes => {
      res.json(volumes);
    })
    .catch(error => {
      console.error('Error fetching volumes:', error);
      res.status(500).json({ error: 'Failed to fetch volumes' });
    });
});

// Get volume details
app.get('/api/volumes/:name', (req, res) => {
  const volume = docker.getVolume(req.params.name);
  volume.inspect()
    .then(info => {
      res.json(info);
    })
    .catch(error => {
      console.error(`Error fetching volume ${req.params.name}:`, error);
      res.status(500).json({
        error: `Failed to fetch volume ${req.params.name}`,
        details: error.message || 'Unknown error'
      });
    });
});

// Create a volume
app.post('/api/volumes', writeAuth, (req, res) => {
  const { name, driver, driverOpts, labels } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Volume name is required' });
  }

  const options = {
    Name: name,
    Driver: driver || 'local',
    DriverOpts: driverOpts || {},
    Labels: labels || {}
  };

  docker.createVolume(options)
    .then(volume => {
      res.status(201).json(volume);
    })
    .catch(error => {
      console.error('Error creating volume:', error);
      res.status(500).json({
        error: 'Failed to create volume',
        details: error.json?.message || error.message || 'Unknown error'
      });
    });
});

// Delete a volume
app.delete('/api/volumes/:name', writeAuth, (req, res) => {
  const volume = docker.getVolume(req.params.name);

  volume.remove()
    .then(() => {
      res.json({ success: true, message: `Volume ${req.params.name} deleted successfully` });
    })
    .catch(error => {
      console.error(`Error deleting volume ${req.params.name}:`, error);
      res.status(500).json({
        error: `Failed to delete volume ${req.params.name}`,
        details: error.json?.message || error.message || 'Unknown error'
      });
    });
});

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../out')));

  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../out/index.html'));
  });
}

// Socket.IO handlers for interactive shell
io.on('connection', (socket) => {
  // console.log('Client connected:', socket.id);

  // Handle container shell sessions
  socket.on('container:shell:start', async (data) => {
    const { containerId, shell = '/bin/sh' } = data;
    // console.log(`Starting shell session for container ${containerId} with ${shell}`);

    try {
      // Close existing stream if any
      if (socket.containerStream) {
        try {
          socket.containerStream.end();
        } catch (err) {
          console.log('Error closing existing stream:', err);
        }
        socket.containerStream = null;
      }

      const container = docker.getContainer(containerId);

      // Check if container exists and is running
      const info = await container.inspect();
      if (!info.State.Running) {
        socket.emit('container:shell:error', { error: 'Container is not running' });
        return;
      }

      // Create exec instance
      const exec = await container.exec({
        Cmd: [shell],
        AttachStdout: true,
        AttachStderr: true,
        AttachStdin: true,
        Tty: true
      });

      // Store the exec instance for resize operations
      socket.containerExec = exec;

      // Start exec instance
      const stream = await exec.start({
        Detach: false,
        Tty: true,
        stdin: true,
        hijack: true
      });

      // Store the stream for this socket
      socket.containerStream = stream;

      // Handle data from container
      stream.on('data', (chunk) => {
        socket.emit('container:shell:output', { output: chunk.toString('utf8') });
      });

      // Handle stream end
      stream.on('end', () => {
        // console.log(`Shell session ended for container ${containerId}`);
        socket.emit('container:shell:end');
        socket.containerStream = null;
        socket.containerExec = null;
      });

      // Handle stream errors
      stream.on('error', (err) => {
        console.error(`Stream error for container ${containerId}:`, err);
        socket.emit('container:shell:error', { error: err.message || 'Stream error' });
        socket.containerStream = null;
        socket.containerExec = null;
      });

      // Notify client that shell is ready
      socket.emit('container:shell:ready');
      // console.log(`Shell ready for container ${containerId}`);
    } catch (error) {
      console.error(`Error starting shell for container ${containerId}:`, error);
      socket.emit('container:shell:error', {
        error: error.json?.message || error.message || 'Failed to start shell'
      });
    }
  });

  // Handle input from client
  socket.on('container:shell:input', (data) => {
    const { input } = data;
    if (socket.containerStream && socket.containerStream.writable) {
      try {
        socket.containerStream.write(input);
      } catch (error) {
        console.error('Error writing to container stream:', error);
        socket.emit('container:shell:error', { error: 'Failed to send input to container' });
      }
    } else {
      console.warn('Container stream not available or not writable');
      socket.emit('container:shell:error', { error: 'Terminal connection lost. Please refresh the page.' });
    }
  });

  // Handle resize terminal
  socket.on('container:shell:resize', async (data) => {
    const { containerId, cols, rows } = data;
    if (socket.containerExec) {
      try {
        await socket.containerExec.resize({ h: rows, w: cols });
      } catch (error) {
        console.error(`Error resizing terminal for container ${containerId}:`, error);
      }
    }
  });

  // Handle client disconnect
  socket.on('disconnect', () => {
    // console.log('Client disconnected:', socket.id);
    if (socket.containerStream) {
      try {
        socket.containerStream.end();
      } catch (error) {
        console.error('Error closing container stream:', error);
      }
    }
  });
});

// Start the server
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
