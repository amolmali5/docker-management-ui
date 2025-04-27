# Remote Docker Server Management

This directory contains documentation on how to set up and connect to remote Docker servers using the Docker Management UI.

## Overview

The Docker Management UI allows you to monitor and manage Docker containers running on remote servers. This feature enables centralized management of multiple Docker environments from a single interface.

## Documentation Files

- [Quick Start Guide](quick-start.md) - Get started quickly with remote server connections
- [HTTP Setup Guide](http-setup.md) - Set up Docker API over HTTP (port 2375)
- [HTTPS Setup Guide](https-setup.md) - Set up Docker API over HTTPS with TLS (port 2376)
- [Troubleshooting](troubleshooting.md) - Common issues and solutions
- [Security Considerations](security.md) - Important security information for remote connections

## Connection Options Summary

| Protocol | Port | Security | Use Case |
|----------|------|----------|----------|
| HTTP     | 2375 | None     | Development, trusted networks |
| HTTPS    | 2376 | TLS      | Production, untrusted networks |

## Feature Overview

- Add and manage multiple remote Docker servers
- Switch between servers with a single click
- Secure connections with TLS client certificates
- Test connections before adding servers
- View server status (online/offline)
