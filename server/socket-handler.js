/**
 * Socket.io handler for container terminal functionality
 */

const { spawn } = require('child_process');
const { detectShell } = require('./shell-detector');

/**
 * Initialize socket.io handlers
 * @param {Object} io - Socket.io instance
 */
function initSocketHandlers(io) {
  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    
    let shellProcess = null;
    
    // Handle shell session start
    socket.on('container:shell:start', async (data) => {
      try {
        const { containerId, shell: requestedShell } = data;
        
        // Detect the best available shell
        const shell = requestedShell || await detectShell(containerId);
        
        // Spawn docker exec process
        shellProcess = spawn('docker', [
          'exec',
          '-i',
          containerId,
          shell
        ]);
        
        // Handle shell process output
        shellProcess.stdout.on('data', (data) => {
          socket.emit('container:shell:output', { output: data.toString() });
        });
        
        shellProcess.stderr.on('data', (data) => {
          socket.emit('container:shell:output', { output: data.toString() });
        });
        
        // Handle shell process exit
        shellProcess.on('exit', (code) => {
          socket.emit('container:shell:end', { code });
          shellProcess = null;
        });
        
        // Handle shell process error
        shellProcess.on('error', (error) => {
          socket.emit('container:shell:error', { error: error.message });
          shellProcess = null;
        });
        
        // Notify client that shell is ready
        socket.emit('container:shell:ready');
        
      } catch (error) {
        console.error('Error starting shell session:', error);
        socket.emit('container:shell:error', { error: error.message });
      }
    });
    
    // Handle shell input
    socket.on('container:shell:input', (data) => {
      if (shellProcess && shellProcess.stdin.writable) {
        shellProcess.stdin.write(data.input);
      }
    });
    
    // Handle shell resize
    socket.on('container:shell:resize', (data) => {
      // This would require a more complex setup with pty.js
      // For now, we'll just acknowledge the resize
      console.log('Terminal resize requested:', data);
    });
    
    // Handle client disconnect
    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
      if (shellProcess) {
        // Kill the shell process when client disconnects
        shellProcess.kill();
        shellProcess = null;
      }
    });
  });
}

module.exports = {
  initSocketHandlers
};
