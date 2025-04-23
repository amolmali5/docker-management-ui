/**
 * Utility to detect available shell in a container
 */

const { exec } = require('child_process');

/**
 * Detects the available shell in a container
 * @param {string} containerId - The Docker container ID
 * @returns {Promise<string>} - The path to the available shell
 */
async function detectShell(containerId) {
  // List of shells to check in order of preference
  const shells = [
    '/bin/bash',
    '/bin/sh',
    '/bin/ash'
  ];

  // Try each shell in order
  for (const shell of shells) {
    try {
      const result = await checkShellExists(containerId, shell);
      if (result) {
        console.log(`Detected shell ${shell} in container ${containerId}`);
        return shell;
      }
    } catch (error) {
      console.log(`Shell ${shell} not available in container ${containerId}`);
    }
  }

  // Default to /bin/sh if no shell is detected
  console.log(`No shell detected in container ${containerId}, defaulting to /bin/sh`);
  return '/bin/sh';
}

/**
 * Checks if a shell exists in a container
 * @param {string} containerId - The Docker container ID
 * @param {string} shell - The shell path to check
 * @returns {Promise<boolean>} - True if the shell exists
 */
function checkShellExists(containerId, shell) {
  return new Promise((resolve, reject) => {
    exec(`docker exec ${containerId} ${shell} -c "echo shell_exists"`, (error, stdout) => {
      if (error) {
        reject(error);
      } else if (stdout.trim() === 'shell_exists') {
        resolve(true);
      } else {
        reject(new Error('Shell check failed'));
      }
    });
  });
}

module.exports = {
  detectShell
};
