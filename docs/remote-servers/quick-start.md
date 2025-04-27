# Quick Start Guide: Adding Remote Docker Servers

This guide provides a quick overview of how to add a remote Docker server to the Docker Management UI.

## Prerequisites

- A remote server with Docker installed
- Network connectivity between your Docker Management UI and the remote server
- Administrative access to the remote server

## Step 1: Choose a Connection Method

You have two options for connecting to a remote Docker server:

1. **HTTP (Port 2375)** - Simpler but less secure, suitable for development environments
2. **HTTPS (Port 2376)** - More secure with TLS encryption, recommended for production environments

For detailed setup instructions, see:
- [HTTP Setup Guide](http-setup.md)
- [HTTPS Setup Guide](https-setup.md)

## Step 2: Add the Server in the UI

1. Log in to the Docker Management UI
2. Navigate to the **Servers** page using the sidebar
3. Click the **Add Server** button
4. Fill in the server details:
   - **Server Name**: A descriptive name (e.g., "Production Server")
   - **Host**: IP address or hostname of your remote server
   - **Protocol**: `http` or `https`
   - **Port**: `2375` for HTTP or `2376` for HTTPS
   - **TLS Authentication**: Enable if using HTTPS or TLS with HTTP
   - **Certificates**: Add your CA, client certificate, and key if using TLS
5. Click **Test Connection** to verify connectivity
6. Click **Add Server** to save the configuration

## Step 3: Use the Remote Server

1. After adding the server, it will appear in the server selector in the top navigation bar
2. Click the server selector and choose your remote server
3. The UI will now display and manage containers from the selected server
4. You can switch back to the local Docker daemon at any time

## Next Steps

- Review the [Security Considerations](security.md) for remote connections
- Check the [Troubleshooting](troubleshooting.md) guide if you encounter issues
- Set up additional remote servers as needed
