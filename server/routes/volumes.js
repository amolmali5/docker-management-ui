const express = require('express');
const router = express.Router();
const Dockerode = require('dockerode');
const { writeAuth } = require('../middleware/auth');
const remoteDocker = require('../middleware/remote-docker');

// Apply remote Docker middleware to all routes
router.use(remoteDocker);

// Get all volumes with usage information
router.get('/', async (req, res) => {
  try {
    // Get all volumes
    const volumesResponse = await req.docker.listVolumes();

    // Get all containers to check which volumes are in use
    const containers = await req.docker.listContainers({ all: true });

    // Create a map of volume names to their usage status and container info
    const volumeUsage = {};

    // Check each container for volume mounts
    for (const container of containers) {
      // Get detailed container info to access Mounts
      const containerInfo = await req.docker.getContainer(container.Id).inspect();
      const containerName = containerInfo.Name.replace(/^\//, ''); // Remove leading slash

      // Check each mount to see if it's a volume
      if (containerInfo.Mounts && Array.isArray(containerInfo.Mounts)) {
        for (const mount of containerInfo.Mounts) {
          if (mount.Type === 'volume' && mount.Name) {
            if (!volumeUsage[mount.Name]) {
              volumeUsage[mount.Name] = {
                inUse: true,
                containers: []
              };
            }

            // Add container info to the volume usage
            volumeUsage[mount.Name].containers.push({
              Id: container.Id,
              Name: containerName
            });
          }
        }
      }
    }

    // If volumes exist and are in an array, add the usage information
    if (volumesResponse.Volumes && Array.isArray(volumesResponse.Volumes)) {
      volumesResponse.Volumes = volumesResponse.Volumes.map(volume => ({
        ...volume,
        InUse: volumeUsage[volume.Name] ? true : false,
        UsedByContainers: volumeUsage[volume.Name] ? volumeUsage[volume.Name].containers : []
      }));
    }

    res.json(volumesResponse);
  } catch (error) {
    console.error('Error fetching volumes with usage info:', error);
    res.status(500).json({ error: 'Failed to fetch volumes' });
  }
});

// Get volume details with usage information
router.get('/:name', async (req, res) => {
  try {
    const volume = req.docker.getVolume(req.params.name);
    const volumeInfo = await volume.inspect();

    // Check if the volume is being used by any container
    const containers = await req.docker.listContainers({ all: true });
    let inUse = false;
    const usedByContainers = [];

    // Check each container for volume mounts
    for (const container of containers) {
      // Get detailed container info to access Mounts
      const containerInfo = await req.docker.getContainer(container.Id).inspect();
      const containerName = containerInfo.Name.replace(/^\//, ''); // Remove leading slash

      // Check each mount to see if it's using this volume
      if (containerInfo.Mounts && Array.isArray(containerInfo.Mounts)) {
        for (const mount of containerInfo.Mounts) {
          if (mount.Type === 'volume' && mount.Name === req.params.name) {
            inUse = true;
            usedByContainers.push({
              Id: container.Id,
              Name: containerName
            });
          }
        }
      }
    }

    // Add usage information to the volume details
    volumeInfo.InUse = inUse;
    volumeInfo.UsedByContainers = usedByContainers;

    res.json(volumeInfo);
  } catch (error) {
    console.error(`Error fetching volume ${req.params.name}:`, error);
    res.status(500).json({
      error: `Failed to fetch volume ${req.params.name}`,
      details: error.message || 'Unknown error'
    });
  }
});

// Create a volume
router.post('/', writeAuth, (req, res) => {
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

  req.docker.createVolume(options)
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
router.delete('/:name', writeAuth, (req, res) => {
  const volume = req.docker.getVolume(req.params.name);

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

module.exports = router;
