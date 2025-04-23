const { db } = require('./db');
const bcrypt = require('bcryptjs');

async function resetAdmin() {
  try {
    // Generate a new hash for the password "admin"
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash('admin', salt);
    
    // Update the admin user
    db.get('users')
      .find({ username: 'admin' })
      .assign({
        password: hash,
        firstLogin: true
      })
      .write();
    
    console.log('Admin password reset to "admin" and firstLogin set to true');
    console.log('New hash:', hash);
  } catch (err) {
    console.error('Error resetting admin password:', err);
  }
}

resetAdmin();
