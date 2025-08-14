const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Optional: serve frontend files if placed in /public
// app.use(express.static(path.join(__dirname, 'public')));

// SQLite DB setup
const dbPath = path.join(__dirname, 'shipments.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("❌ Failed to connect to database:", err.message);
  } else {
    console.log("✅ Connected to SQLite database.");
  }
});

// Create shipments table
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS shipments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      trackingNumber TEXT UNIQUE,
      sender TEXT,
      receiver TEXT,
      description TEXT,
      status TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) {
      console.error("❌ Failed to create table:", err.message);
    } else {
      console.log("✅ Shipments table ready.");
    }
  });
});

// Generate tracking number
function generateTrackingNumber() {
  const randomPart = Math.floor(100 + Math.random() * 900); // Random 3-digit number
  return 'LIB' + Date.now().toString().slice(-6) + randomPart;
}

// Route: Home test
app.get('/', (req, res) => {
  res.send('Libam Shipping Server is Running!');
});

// Route: Create shipment
app.post('/create-shipment', (req, res) => {
  const { sender, receiver, description } = req.body;

  if (!sender || !receiver || !description) {
    return res.status(400).json({ error: "Missing shipment details" });
  }

  const trackingNumber = generateTrackingNumber();
  const status = `Shipment created - Awaiting pickup for "${description}"`;

  db.run(
    `INSERT INTO shipments (trackingNumber, sender, receiver, description, status) 
     VALUES (?, ?, ?, ?, ?)`,
    [trackingNumber, sender, receiver, description, status],
    function (err) {
      if (err) {
        console.error("❌ Insert Error:", err.message);
        return res.status(500).json({ error: 'Failed to create shipment' });
      }

      console.log(`✅ New shipment added: ${trackingNumber}`);
      res.json({ trackingNumber, message: "Shipment created successfully" });
    }
  );
});

// Route: Track shipment
app.get('/track/:trackingNumber', (req, res) => {
  const { trackingNumber } = req.params;

  db.get(
    `SELECT * FROM shipments WHERE trackingNumber = ?`,
    [trackingNumber],
    (err, row) => {
      if (err) {
        console.error("❌ DB Error:", err.message);
        return res.status(500).json({ error: 'Database error' });
      }

      if (row) {
        res.json({
          trackingNumber: row.trackingNumber,
          sender: row.sender,
          receiver: row.receiver,
          description: row.description,
          status: row.status,
          created_at: row.created_at
        });
      } else {
        res.status(404).json({ error: 'Tracking number not found' });
      }
    }
  );
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running at: http://localhost:${PORT}`);
});
