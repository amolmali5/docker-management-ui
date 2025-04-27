# Setting Up Docker API over HTTPS with TLS (Port 2376)

This guide explains how to configure a Docker daemon to accept API requests over HTTPS with TLS client authentication on port 2376.

## Prerequisites

- A remote server with Docker installed
- Administrative access to the server
- OpenSSL installed for certificate generation

## Configuration Steps

### Step 1: Create TLS Certificates

1. Connect to your remote server via SSH
2. Create a directory for the certificates:

```bash
mkdir -p ~/.docker/certs
cd ~/.docker/certs
```

3. Generate a Certificate Authority (CA) key and certificate:

```bash
# Generate CA key
openssl genrsa -aes256 -out ca-key.pem 4096

# Generate CA certificate
openssl req -new -x509 -days 365 -key ca-key.pem -sha256 -out ca.pem
```

4. Generate server key and certificate:

```bash
# Create server key
openssl genrsa -out server-key.pem 4096

# Create server certificate signing request (CSR)
# Replace YOUR_SERVER_IP with your server's IP address
openssl req -subj "/CN=YOUR_SERVER_IP" -sha256 -new -key server-key.pem -out server.csr

# Create an extensions config file for IP SANs
echo "subjectAltName = IP:YOUR_SERVER_IP,IP:127.0.0.1" > extfile.cnf

# Sign the server certificate
openssl x509 -req -days 365 -sha256 -in server.csr -CA ca.pem -CAkey ca-key.pem \
  -CAcreateserial -out server-cert.pem -extfile extfile.cnf
```

5. Generate client key and certificate:

```bash
# Create client key
openssl genrsa -out key.pem 4096

# Create client certificate signing request
openssl req -subj '/CN=client' -new -key key.pem -out client.csr

# Create an extensions config file for client authentication
echo "extendedKeyUsage = clientAuth" > extfile-client.cnf

# Sign the client certificate
openssl x509 -req -days 365 -sha256 -in client.csr -CA ca.pem -CAkey ca-key.pem \
  -CAcreateserial -out cert.pem -extfile extfile-client.cnf
```

6. Set proper permissions:

```bash
chmod 0400 ca-key.pem key.pem server-key.pem
chmod 0444 ca.pem server-cert.pem cert.pem
```

### Step 2: Configure Docker Daemon

1. Copy the certificates to a secure location:

```bash
sudo mkdir -p /etc/docker/certs
sudo cp {ca,server-cert,server-key}.pem /etc/docker/certs/
```

2. Edit the Docker daemon configuration:

```bash
sudo nano /etc/docker/daemon.json
```

3. Add or modify the configuration:

```json
{
  "hosts": ["unix:///var/run/docker.sock", "tcp://0.0.0.0:2376"],
  "tls": true,
  "tlscacert": "/etc/docker/certs/ca.pem",
  "tlscert": "/etc/docker/certs/server-cert.pem",
  "tlskey": "/etc/docker/certs/server-key.pem",
  "tlsverify": true
}
```

### Step 3: Create a Docker Service Override

1. Create the systemd override directory:

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

### Step 4: Restart Docker

1. Reload the systemd daemon:

```bash
sudo systemctl daemon-reload
```

2. Restart the Docker service:

```bash
sudo systemctl restart docker
```

### Step 5: Configure Firewall (if applicable)

If you're using a firewall, allow connections to port 2376:

```bash
# For UFW (Ubuntu)
sudo ufw allow 2376/tcp

# For firewalld (CentOS/RHEL)
sudo firewall-cmd --permanent --add-port=2376/tcp
sudo firewall-cmd --reload
```

### Step 6: Verify the Configuration

Test that the Docker API is accessible with TLS:

```bash
# From the remote server itself
curl --cacert ~/.docker/certs/ca.pem --cert ~/.docker/certs/cert.pem --key ~/.docker/certs/key.pem https://localhost:2376/version

# From another machine (replace SERVER_IP with your server's IP)
curl --cacert ca.pem --cert cert.pem --key key.pem https://SERVER_IP:2376/version
```

You should receive a JSON response with Docker version information.

## Adding the Server to Docker Management UI

1. Navigate to the **Servers** page in the Docker Management UI
2. Click **Add Server**
3. Fill in the details:
   - **Server Name**: A descriptive name
   - **Host**: Your server's IP address or hostname
   - **Protocol**: `https`
   - **Port**: `2376`
   - **TLS Authentication**: Enabled
   - **CA Certificate**: Copy the content of your `ca.pem` file
   - **Client Certificate**: Copy the content of your `cert.pem` file
   - **Client Key**: Copy the content of your `key.pem` file
4. Click **Test Connection** to verify
5. Click **Add Server** to save

## Client Certificate Files

For the Docker Management UI, you'll need these files from your certificate generation process:

- **CA Certificate**: `ca.pem`
- **Client Certificate**: `cert.pem`
- **Client Key**: `key.pem`

Make sure to securely transfer these files from your server to your local machine for adding to the Docker Management UI.

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

3. Verify the Docker daemon is listening on port 2376:
```bash
sudo netstat -tuln | grep 2376
```

4. Test TLS connectivity:
```bash
openssl s_client -connect localhost:2376
```

5. See the [Troubleshooting](troubleshooting.md) guide for more help.
