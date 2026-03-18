const sqlite3 = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

const dbPath = path.join(__dirname, 'dev.db');
const db = sqlite3(dbPath);

async function run() {
    const hashed = await bcrypt.hash('password123', 12);

    // Update or insert admin@foxcrm.com
    const user = db.prepare('SELECT id FROM User WHERE email = ?').get('admin@foxcrm.com');

    if (user) {
        db.prepare('UPDATE User SET password = ?, role = ? WHERE email = ?').run(hashed, 'Administrator', 'admin@foxcrm.com');
        console.log('Updated admin@foxcrm.com password and role.');
    } else {
        const id = 'admin-' + Date.now();
        db.prepare('INSERT INTO User (id, name, email, password, role, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)')
            .run(id, 'System Admin', 'admin@foxcrm.com', hashed, 'Administrator', new Date().toISOString(), new Date().toISOString());
        console.log('Created admin@foxcrm.com with role Administrator and password password123.');
    }
}

run().catch(console.error);
