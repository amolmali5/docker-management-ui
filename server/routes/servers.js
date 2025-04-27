const express = require('express');
const { db } = require('../db');
const Dockerode = require('dockerode');
const { auth, adminAuth, writeAuth } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// Helper function to create a Docker client for a server
function createDockerClient(server) {
  // Special handling for local Docker server
  if (server.protocol === 'local' || server.isLocal) {
    console.log(`Creating local Docker client for server ${server.name}`);

    // Create a Docker client with default options (connects to local Docker socket)
    const docker = new Dockerode();

    // Add a ping method to check if the server is reachable
    docker.ping = async function () {
      try {
        const version = await this.version();
        return version;
      } catch (error) {
        console.error(`Ping failed for local Docker server:`, error.message);
        throw error;
      }
    };

    return docker;
  }

  // For remote Docker servers
  const options = {
    host: server.host,
    port: server.port
  };

  // Add TLS options if using HTTPS
  if (server.protocol === 'https' || server.useTLS) {
    options.protocol = 'https';
    options.ca = server.ca;
    options.cert = server.cert;
    options.key = server.key;
  } else {
    options.protocol = 'http';
  }

  console.log(`Creating Docker client for server ${server.name} (${server.host}:${server.port})`);

  const docker = new Dockerode(options);

  // Add a ping method to check if the server is reachable
  docker.ping = async function () {
    try {
      const version = await this.version();
      return version;
    } catch (error) {
      console.error(`Ping failed for server ${server.name}:`, error.message);
      throw error;
    }
  };

  return docker;
}

// @route   GET /api/servers
// @desc    Get all servers
// @access  Authenticated users
router.get('/', auth, async (req, res) => {
  try {
    // Initialize servers array if it doesn't exist
    if (!db.has('servers').value()) {
      db.set('servers', []).write();
    }

    let servers = db.get('servers').value();

    // Check for and remove any duplicate Local Docker servers
    const localServerId = 'local';
    const localServers = servers.filter(server => server.id === localServerId ||
      (server.host === 'localhost' && server.isLocal));

    // Remove all local servers from the database
    if (localServers.length > 0) {
      db.get('servers').remove(server => server.id === localServerId ||
        (server.host === 'localhost' && server.isLocal)).write();

      // Remove from the current servers array
      servers = servers.filter(server => server.id !== localServerId &&
        !(server.host === 'localhost' && server.isLocal));
    }

    // Add a single local Docker server
    const localServer = {
      id: localServerId,
      name: 'Local Docker',
      host: 'localhost',
      port: 0, // Special port for local Docker
      protocol: 'local',
      status: 'online', // Always set local Docker as online
      isLocal: true,
      createdAt: new Date().toISOString(),
      lastChecked: new Date().toISOString()
    };

    servers.push(localServer);
    db.get('servers').push(localServer).write();

    // Filter servers based on user access
    if (req.user.role !== 'admin') {
      // Get user's server access settings
      const user = db.get('users').find({ id: req.user.id }).value();
      const serverAccess = user.serverAccess || { type: 'specific', serverIds: [] };

      // If user has specific server access, filter the servers
      if (serverAccess.type === 'specific') {
        servers = servers.filter(server => serverAccess.serverIds.includes(server.id));
      }
      // If type is 'none', return empty array
      else if (serverAccess.type === 'none') {
        servers = [];
      }
      // If type is 'all' (only for admin or legacy users), show all servers
    }

    // Check if we should update server status
    const updateStatus = req.query.updateStatus === 'true';

    if (updateStatus) {
      console.log('Updating status for all servers');
      // Update status for all servers
      for (const server of servers) {
        // Always set local Docker server as online
        if (server.protocol === 'local' || server.isLocal) {
          server.status = 'online';
          server.lastChecked = new Date().toISOString();
          continue;
        }

        try {
          const dockerClient = createDockerClient(server);
          await dockerClient.ping();
          server.status = 'online';
          server.lastChecked = new Date().toISOString();
        } catch (error) {
          console.error(`Error connecting to server ${server.id}:`, error.message);
          server.status = 'offline';
          server.lastChecked = new Date().toISOString();
        }
      }

      // Save updated statuses
      db.write();
    }

    res.json(servers);
  } catch (err) {
    console.error('Error getting servers:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /api/servers/:id
// @desc    Get server by ID
// @access  Authenticated users
router.get('/:id', auth, async (req, res) => {
  try {
    const server = db.get('servers').find({ id: req.params.id }).value();

    if (!server) {
      return res.status(404).json({ error: 'Server not found' });
    }

    // Check if user has access to this server
    if (req.user.role !== 'admin') {
      // Get user's server access settings
      const user = db.get('users').find({ id: req.user.id }).value();
      const serverAccess = user.serverAccess || { type: 'specific', serverIds: [] };

      // Check access permissions
      if (serverAccess.type === 'none') {
        return res.status(403).json({ error: 'Access denied to this server' });
      }

      if (serverAccess.type === 'specific' && !serverAccess.serverIds.includes(server.id)) {
        return res.status(403).json({ error: 'Access denied to this server' });
      }

      // Note: Only allow access if user has 'all' access or specific access to this server
    }

    res.json(server);
  } catch (err) {
    console.error(`Error getting server ${req.params.id}:`, err);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   POST /api/servers
// @desc    Add a new server
// @access  Authenticated users
router.post('/', auth, async (req, res) => {
  try {
    const { name, host, port, protocol, ca, cert, key } = req.body;

    // Simple validation
    if (!name || !host || !port) {
      return res.status(400).json({ error: 'Please provide name, host, and port' });
    }

    // Check if server with same name or host:port already exists
    const existingServer = db.get('servers')
      .find(server =>
        server.name === name ||
        (server.host === host && server.port === parseInt(port))
      )
      .value();

    if (existingServer) {
      return res.status(400).json({ error: 'Server with this name or host:port combination already exists' });
    }

    // Create new server object
    const newServer = {
      id: uuidv4(),
      name,
      host,
      port: parseInt(port),
      protocol: protocol || 'http',
      status: 'unknown',
      createdAt: new Date().toISOString()
    };

    // Add TLS certificates if provided
    if (protocol === 'https' || req.body.useTLS) {
      newServer.ca = ca;
      newServer.cert = cert;
      newServer.key = key;
    }

    // Initialize servers array if it doesn't exist
    if (!db.has('servers').value()) {
      db.set('servers', []).write();
    }

    // Add to servers array
    db.get('servers').push(newServer).write();

    res.status(201).json(newServer);
  } catch (err) {
    console.error('Error adding server:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   PUT /api/servers/:id
// @desc    Update a server
// @access  Authenticated users
router.put('/:id', auth, async (req, res) => {
  try {
    const { name, host, port, protocol, ca, cert, key } = req.body;

    // Simple validation
    if (!name || !host || !port) {
      return res.status(400).json({ error: 'Please provide name, host, and port' });
    }

    const server = db.get('servers').find({ id: req.params.id }).value();

    if (!server) {
      return res.status(404).json({ error: 'Server not found' });
    }

    // Check if another server with same name or host:port already exists
    const existingServer = db.get('servers')
      .find(s =>
        s.id !== req.params.id &&
        (s.name === name || (s.host === host && s.port === parseInt(port)))
      )
      .value();

    if (existingServer) {
      return res.status(400).json({ error: 'Another server with this name or host:port combination already exists' });
    }

    // Update server
    const updatedServer = {
      ...server,
      name,
      host,
      port: parseInt(port),
      protocol: protocol || 'http',
      updatedAt: new Date().toISOString()
    };

    // Update TLS certificates if provided
    if (protocol === 'https' || req.body.useTLS) {
      updatedServer.ca = ca || server.ca;
      updatedServer.cert = cert || server.cert;
      updatedServer.key = key || server.key;
    } else {
      // Remove TLS certificates if not using HTTPS
      delete updatedServer.ca;
      delete updatedServer.cert;
      delete updatedServer.key;
    }

    // Update in database
    db.get('servers')
      .find({ id: req.params.id })
      .assign(updatedServer)
      .write();

    res.json(updatedServer);
  } catch (err) {
    console.error(`Error updating server ${req.params.id}:`, err);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   DELETE /api/servers/:id
// @desc    Delete a server
// @access  Authenticated users
router.delete('/:id', auth, async (req, res) => {
  try {
    const server = db.get('servers').find({ id: req.params.id }).value();

    if (!server) {
      return res.status(404).json({ error: 'Server not found' });
    }

    // Remove from database
    db.get('servers')
      .remove({ id: req.params.id })
      .write();

    res.json({ success: true, message: `Server ${server.name} deleted successfully` });
  } catch (err) {
    console.error(`Error deleting server ${req.params.id}:`, err);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   POST /api/servers/test
// @desc    Test connection to a server (without saving)
// @access  Authenticated users
router.post('/test', auth, async (req, res) => {
  try {
    const { host, port, protocol, ca, cert, key } = req.body;

    // Simple validation
    if (!host || !port) {
      return res.status(400).json({ error: 'Please provide host and port' });
    }

    // Create temporary server object
    const tempServer = {
      host,
      port: parseInt(port),
      protocol: protocol || 'http'
    };

    // Add TLS certificates if provided
    if (protocol === 'https' || req.body.useTLS) {
      tempServer.ca = ca;
      tempServer.cert = cert;
      tempServer.key = key;
    }

    // Create Docker client
    const dockerClient = createDockerClient(tempServer);

    // Test connection
    try {
      const info = await dockerClient.info();
      res.json({
        success: true,
        message: 'Connection successful',
        info: {
          name: info.Name,
          version: info.ServerVersion,
          containers: info.Containers,
          images: info.Images
        }
      });
    } catch (error) {
      console.error('Connection test failed:', error);
      res.status(200).json({
        success: false,
        error: `Connection failed: ${error.message || 'Unknown error'}`
      });
    }
  } catch (err) {
    console.error('Error testing server connection:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   POST /api/servers/:id/test
// @desc    Test connection to an existing server
// @access  Authenticated users
router.post('/:id/test', auth, async (req, res) => {
  try {
    const server = db.get('servers').find({ id: req.params.id }).value();

    if (!server) {
      return res.status(404).json({ error: 'Server not found' });
    }

    // Special handling for local Docker server
    if (server.protocol === 'local' || server.isLocal) {
      try {
        // Create Docker client for local Docker
        const dockerClient = createDockerClient(server);
        const info = await dockerClient.info();

        // Always set local Docker server as online
        db.get('servers')
          .find({ id: req.params.id })
          .assign({
            status: 'online',
            lastChecked: new Date().toISOString()
          })
          .write();

        res.json({
          success: true,
          message: 'Connection to local Docker successful',
          info: {
            name: info.Name,
            version: info.ServerVersion,
            containers: info.Containers,
            images: info.Images
          }
        });
      } catch (error) {
        console.error(`Connection test failed for local Docker server:`, error);

        // Even if the test fails, keep the status as online for local Docker
        db.get('servers')
          .find({ id: req.params.id })
          .assign({
            status: 'online', // Keep as online even if test fails
            lastChecked: new Date().toISOString()
          })
          .write();

        res.status(200).json({
          success: false,
          error: `Connection to local Docker failed: ${error.message || 'Unknown error'}`
        });
      }
      return;
    }

    // For remote Docker servers
    const dockerClient = createDockerClient(server);

    // Test connection
    try {
      const info = await dockerClient.info();

      // Update server status
      db.get('servers')
        .find({ id: req.params.id })
        .assign({
          status: 'online',
          lastChecked: new Date().toISOString()
        })
        .write();

      res.json({
        success: true,
        message: 'Connection successful',
        info: {
          name: info.Name,
          version: info.ServerVersion,
          containers: info.Containers,
          images: info.Images
        }
      });
    } catch (error) {
      console.error(`Connection test failed for server ${req.params.id}:`, error);

      // Update server status
      db.get('servers')
        .find({ id: req.params.id })
        .assign({
          status: 'offline',
          lastChecked: new Date().toISOString()
        })
        .write();

      res.status(200).json({
        success: false,
        error: `Connection failed: ${error.message || 'Unknown error'}`
      });
    }
  } catch (err) {
    console.error(`Error testing server ${req.params.id} connection:`, err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
