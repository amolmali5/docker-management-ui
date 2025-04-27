# Setting Up Docker API over HTTP (Port 2375)

This guide explains how to configure a Docker daemon to accept API requests over HTTP on port 2375.

> **⚠️ Security Warning**: HTTP connections are unencrypted and unauthenticated. Only use this method in secure, isolated networks or for development purposes. For production environments, use [HTTPS with TLS](https-setup.md).

## Configuration Steps

### Step 1: Edit the Docker Daemon Configuration

1. Connect to your remote server via SSH
2. Edit the Docker daemon configuration file:

```bash
sudo nano /etc/docker/daemon.json
```

3. Add or modify the configuration to expose the API:

```json
{
  "hosts": ["unix:///var/run/docker.sock", "tcp://0.0.0.0:2375"]
}
```

> **Note**: Including `unix:///var/run/docker.sock` maintains local socket access.

### Step 2: Create a Docker Service Override

1. Create the systemd override directory if it doesn't exist:

```bash
sudo mkdir -p /etc/systemd/system/docker.service.d
```

2. Create an override file:

```bash
sudo nano /etc/systemd/system/docker.service.d/override.conf
```

3. Add the following content:

```
[Service]
ExecStart=
ExecStart=/usr/bin/dockerd
```

> **Note**: This removes the default ExecStart command and replaces it with one that allows the daemon.json configuration to take effect.

### Step 3: Restart Docker

1. Reload the systemd daemon:

```bash
sudo systemctl daemon-reload
```

2. Restart the Docker service:

```bash
sudo systemctl restart docker
```

### Step 4: Configure Firewall (if applicable)

If you're using a firewall, allow connections to port 2375:

```bash
# For UFW (Ubuntu)
sudo ufw allow 2375/tcp

# For firewalld (CentOS/RHEL)
sudo firewall-cmd --permanent --add-port=2375/tcp
sudo firewall-cmd --reload
```

### Step 5: Verify the Configuration

Test that the Docker API is accessible:

```bash
# From the remote server itself
curl http://localhost:2375/version

# From another machine (replace SERVER_IP with your server's IP)
curl http://SERVER_IP:2375/version
```

You should receive a JSON response with Docker version information.

## Adding the Server to Docker Management UI

1. Navigate to the **Servers** page in the Docker Management UI
2. Click **Add Server**
3. Fill in the details:
   - **Server Name**: A descriptive name
   - **Host**: Your server's IP address or hostname
   - **Protocol**: `http`
   - **Port**: `2375`
   - **TLS Authentication**: Disabled
4. Click **Test Connection** to verify
5. Click **Add Server** to save

## Troubleshooting

If you encounter issues:

1. Check the Docker daemon status:
```bash
sudo systemctl status docker
```

2. Look for errors in the Docker logs:
```bash
sudo journalctl -u docker
```

3. Verify the Docker daemon is listening on port 2375:
```bash
sudo netstat -tuln | grep 2375
```

4. See the [Troubleshooting](troubleshooting.md) guide for more help.

## Security Considerations

Remember that HTTP connections:
- Are unencrypted (all data is sent in plain text)
- Have no authentication (anyone with network access can control your Docker daemon)
- Should only be used in secure, isolated networks

For production environments, consider using [HTTPS with TLS authentication](https-setup.md) instead.
