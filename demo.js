const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2');
const cors = require('cors');
const cluster = require('cluster');
const os = require('os');

const app = express();
const port = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// MySQL connection pool
const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'garments_timer',
});

// Test connection pool
pool.getConnection((err, connection) => {
    if (err) {
        console.error('Error connecting to the database:', err);
    } else {
        console.log('Connected to the database.');
        connection.release();
    }
});

// POST endpoint to receive sewing phase data
app.post('/time', (req, res) => {
    const { id, phase, date, start_time, end_time, avg_current } = req.body;

    console.log('Received data:', { phase, date, start_time, end_time, avg_current });

    // Validate inputs...
    
    const sql = `INSERT INTO monitor (date, phase, start, end, current, id) VALUES (?, ?, ?, ?, ?, ?)`;
    const params = [date, phase, start_time, end_time, avg_current, id];

    pool.execute(sql, params, (err, results) => {
        if (err) {
            console.error('Error executing query:', err);
            return res.status(500).json({ error: err.message });
        }
        res.json(results);
    });
});

// Cluster setup
if (cluster.isMaster) {
    const numCPUs = os.cpus().length;
    console.log(`Master ${process.pid} is running`);
    for (let i = 0; i < numCPUs; i++) {
        cluster.fork();
    }
    cluster.on('exit', (worker, code, signal) => {
        console.log(`Worker ${worker.process.pid} died`);
    });
} else {
    app.listen(port, '0.0.0.0', () => {
        console.log(`Server running at http://0.0.0.0:${port} (Worker: ${process.pid})`);
    });
}
