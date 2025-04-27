# Troubleshooting Remote Docker Connections

This guide provides solutions for common issues when connecting to remote Docker servers.

## Connection Issues

### Cannot Connect to Docker API

**Symptoms:**
- "Connection refused" errors
- Timeout when trying to connect
- Test connection fails in the UI

**Solutions:**

1. **Verify Docker daemon is running:**
   ```bash
   sudo systemctl status docker
   ```

2. **Check Docker daemon configuration:**
   ```bash
   cat /etc/docker/daemon.json
   ```
   Ensure the `hosts` array includes `tcp://0.0.0.0:2375` (for HTTP) or `tcp://0.0.0.0:2376` (for HTTPS).

3. **Verify Docker is listening on the expected port:**
   ```bash
   sudo netstat -tuln | grep 2375  # or 2376 for HTTPS
   ```
   You should see output like: `tcp6 0 0 :::2375 :::* LISTEN`

4. **Test local connectivity on the server:**
   ```bash
   # For HTTP
   curl http://localhost:2375/version
   
   # For HTTPS
   curl --cacert /path/to/ca.pem --cert /path/to/cert.pem --key /path/to/key.pem https://localhost:2376/version
   ```

5. **Check firewall settings:**
   ```bash
   # For UFW (Ubuntu)
   sudo ufw status
   
   # For firewalld (CentOS/RHEL)
   sudo firewall-cmd --list-all
   ```
   Ensure port 2375 or 2376 is allowed.

6. **Verify network connectivity:**
   ```bash
   # From your client machine
   telnet SERVER_IP 2375  # or 2376 for HTTPS
   ```
   If you can connect, you should see a blank screen. Press Ctrl+C to exit.

### TLS Certificate Issues

**Symptoms:**
- "certificate signed by unknown authority" errors
- "certificate verification failed" errors
- "bad certificate" errors

**Solutions:**

1. **Verify certificate paths in daemon.json:**
   ```bash
   cat /etc/docker/daemon.json
   ```
   Ensure paths to `tlscacert`, `tlscert`, and `tlskey` are correct.

2. **Check certificate validity:**
   ```bash
   openssl verify -CAfile ca.pem cert.pem
   ```
   Should return: `cert.pem: OK`

3. **Verify certificate dates:**
   ```bash
   openssl x509 -in cert.pem -noout -dates
   ```
   Check that the current date is between `notBefore` and `notAfter`.

4. **Verify hostname/IP in certificate:**
   ```bash
   openssl x509 -in server-cert.pem -noout -text | grep DNS
   ```
   Ensure the server's hostname or IP is listed.

5. **Regenerate certificates** if necessary, following the [HTTPS Setup Guide](https-setup.md).

### Docker Daemon Won't Start

**Symptoms:**
- Docker service fails to start
- Error messages in Docker logs

**Solutions:**

1. **Check Docker logs:**
   ```bash
   sudo journalctl -u docker
   ```
   Look for specific error messages.

2. **Verify daemon.json syntax:**
   ```bash
   sudo cat /etc/docker/daemon.json | jq
   ```
   If `jq` returns an error, your JSON is invalid.

3. **Check permissions on certificate files:**
   ```bash
   ls -la /etc/docker/certs/
   ```
   Key files should have `400` permissions, certificate files `444`.

4. **Temporarily revert to default configuration:**
   ```bash
   sudo mv /etc/docker/daemon.json /etc/docker/daemon.json.bak
   sudo systemctl restart docker
   ```
   If Docker starts, the issue is in your configuration.

## UI-Specific Issues

### Server Shows as Offline

**Symptoms:**
- Server status shows "Offline" in the UI
- Cannot access containers or other resources

**Solutions:**

1. **Test the connection manually:**
   ```bash
   # For HTTP
   curl http://SERVER_IP:2375/version
   
   # For HTTPS
   curl --cacert ca.pem --cert cert.pem --key key.pem https://SERVER_IP:2376/version
   ```

2. **Check server logs for connection attempts:**
   ```bash
   sudo journalctl -u docker | grep -i "api"
   ```

3. **Verify the server details in the UI:**
   - Check hostname/IP address
   - Verify port number
   - Ensure protocol (HTTP/HTTPS) is correct

4. **Try removing and re-adding the server** in the UI.

### Certificate Format Issues

**Symptoms:**
- "Invalid certificate" errors in the UI
- Connection test fails with certificate errors

**Solutions:**

1. **Ensure certificates are in PEM format** (text files starting with `-----BEGIN CERTIFICATE-----`).

2. **Check for extra whitespace or line breaks** in the certificate fields.

3. **Verify you're using the correct files:**
   - CA Certificate: `ca.pem`
   - Client Certificate: `cert.pem`
   - Client Key: `key.pem`

4. **Regenerate certificates** if necessary.

## Advanced Troubleshooting

### Enable Docker Daemon Debug Logging

1. **Edit the daemon.json file:**
   ```bash
   sudo nano /etc/docker/daemon.json
   ```

2. **Add debug option:**
   ```json
   {
     "debug": true,
     "hosts": ["unix:///var/run/docker.sock", "tcp://0.0.0.0:2376"],
     ...
   }
   ```

3. **Restart Docker:**
   ```bash
   sudo systemctl restart docker
   ```

4. **Check logs for detailed information:**
   ```bash
   sudo journalctl -u docker
   ```

### Test TLS Connection with OpenSSL

```bash
openssl s_client -connect SERVER_IP:2376 -cert cert.pem -key key.pem -CAfile ca.pem
```

If successful, you'll see certificate information and an open connection.

### Check for Network Issues

```bash
# Check route to server
traceroute SERVER_IP

# Check if port is reachable
nc -zv SERVER_IP 2376
```

## Still Having Issues?

If you've tried all the above solutions and still can't connect:

1. **Check Docker version compatibility** between your server and the Docker Management UI.

2. **Review server logs** for any security or access control issues.

3. **Try connecting with the Docker CLI** to isolate if the issue is specific to the UI:
   ```bash
   docker -H tcp://SERVER_IP:2375 info  # For HTTP
   docker --tlsverify --tlscacert=ca.pem --tlscert=cert.pem --tlskey=key.pem -H tcp://SERVER_IP:2376 info  # For HTTPS
   ```

4. **Consider network infrastructure** like load balancers, proxies, or NAT that might be affecting connectivity.
