const Dockerode = require('dockerode');
const { db } = require('../db');

/**
 * Middleware to handle remote Docker connections
 * This middleware checks for X-Server-ID header and creates a Docker client for the specified server
 */
const remoteDocker = (req, res, next) => {
  // Check if X-Server-ID header is present
  const serverId = req.headers['x-server-id'];

  if (!serverId || serverId === 'local') {
    // Local Docker server specified
    const localServerId = 'local';

    // Check if user has access to local Docker
    if (req.user && req.user.role !== 'admin') {
      // Get user's server access settings
      const user = db.get('users').find({ id: req.user.id }).value();
      const serverAccess = user.serverAccess || { type: 'specific', serverIds: [] };

      // Check access permissions
      if (serverAccess.type === 'none') {
        return res.status(403).json({ error: 'Access denied to local Docker server' });
      }

      if (serverAccess.type === 'specific' && !serverAccess.serverIds.includes(localServerId)) {
        return res.status(403).json({ error: 'Access denied to local Docker server' });
      }
    }

    req.docker = new Dockerode();

    // Add server info for local Docker
    req.serverInfo = {
      id: 'local',
      name: 'Local Docker',
      host: 'localhost',
      isLocal: true
    };

    return next();
  }

  // Find the server in the database
  const server = db.get('servers').find({ id: serverId }).value();

  if (!server) {
    return res.status(404).json({ error: 'Server not found' });
  }

  // Check if user has access to this server
  if (req.user && req.user.role !== 'admin') {
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

  try {
    // Create Docker client for the remote server
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

    // Create Docker client
    req.docker = new Dockerode(options);

    // Add server info to request for reference
    req.serverInfo = {
      id: server.id,
      name: server.name,
      host: server.host,
      port: server.port
    };

    next();
  } catch (error) {
    console.error(`Error creating Docker client for server ${serverId}`);
    res.status(500).json({
      error: 'Failed to connect to remote Docker server',
      details: error.message
    });
  }
};

module.exports = remoteDocker;
