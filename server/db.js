const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

// Create data directory if it doesn't exist
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir);
}

// Configure lowdb to use JSON file for storage
const file = path.join(dataDir, 'db.json');
const adapter = new FileSync(file);
const db = low(adapter);

// Initialize database with default data
async function initializeDb() {
  // Set default data if not initialized
  db.defaults({
    users: [],
    servers: [],
    settings: {
      defaultRefreshRate: 10000,
      defaultTheme: 'light'
    }
  }).write();

  // Create admin user if no users exist
  if (db.get('users').size().value() === 0) {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('admin', salt);

    db.get('users').push({
      id: 1,
      username: 'admin',
      email: 'admin@example.com',
      password: hashedPassword,
      role: 'admin',
      createdAt: new Date().toISOString(),
      firstLogin: true,  // Add firstLogin property set to true
      settings: {
        theme: 'light',
        refreshRate: 10000
      }
    }).write();

    console.log('Created default admin user with firstLogin set to true');
  }
}

module.exports = {
  db,
  initializeDb
};
