require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2');
const cors = require('cors');
const fs = require('fs');

const app = express();
//const port = 3000;

app.use(cors());
app.use(bodyParser.json());

// const pool = mysql.createPool({
//     host: 'localhost',
//     user: 'root',
//     password: 'root',
//     database: 'garments_timer',
// });


// Create a connection pool
const pool = mysql.createPool({
    host: 'mysql-388fc0e0-sajiborton6437-af4a.e.aivencloud.com', // Aiven MySQL host
    user: 'avnadmin', // Aiven MySQL user
    password: process.env.AIVEN_PASSWORD, // Aiven MySQL password
    database: '1234', // Aiven MySQL database name
    port: 28256, // Aiven MySQL port
    ssl: {
        ca: fs.readFileSync('./ca.pem'), 
    }
});

// Test connection pool
pool.getConnection((err, connection) => {
    if (err) {
        console.error('Error connecting to MySQL:', err.message);
        console.error('Error stack:', err.stack);
        return;
      }
      console.log('Connected to MySQL as id ' + connection.threadId);
    
});


// Create a /ping endpoint to check server and database status
app.get('/ping', (req, res) => {
    console.log("Ping request received");
    pool.query('SELECT 1', (err, results) => {
      if (err) {
        return res.status(500).send('Database connection failed');
      }
      res.send('PONG');
    });
  });


  app.post('/update', (req, res) => {
    const { machineId, pieces } = req.body; // Expecting pieces in the request

    // Log received data
    console.log('Received data:', req.body);

    // Query to set pieces sewn by the device directly
    const sql = 'UPDATE device SET pieces = ? WHERE id = ?';
    pool.execute(sql, [pieces, machineId], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error: ' + err.message });
        }

        // Log the result of the update operation
        console.log('Update results:', results);

        // Check if rows were affected
        if (results.affectedRows > 0) {
            return res.json({ message: 'Database updated successfully', machineId, pieces });
        } else {
            return res.status(404).json({ message: 'Machine not found or no update was made.' });
        }
    });
});

// POST endpoint to receive data
app.post('/data', (req, res) => {
    const { uid, access } = req.body;
    console.log('Received data:');
    console.log('UID:', uid);
    console.log('Access:', access);

    const sql = 'SELECT lot FROM rfid_lot WHERE rfid = ?';
    pool.execute(sql, [uid], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error: ' + err.message });
        }

        // Log the results to see what we get from the query
        console.log('Results:', results);

        // Check if results are present
        if (results.length > 0) {
            const lotNumber = results[0].lot; // Assuming 'lot' is a string
            console.log('LOT Number:', lotNumber);

            // Send the lot number as a JSON response
            return res.json({ lot: lotNumber.toString() }); // Wrap the lot number in an object
        } else {
            console.log('No results found for UID:', uid);
            return res.status(404).json({ message: 'No lot found for the provided UID.' });
        }
    });
});

// Endpoint for testing
app.get('/', (req, res) => {
    res.send('Server is running');
  });
  
  

app.get('/test', (req, res) => {
    const sql = 'SELECT * FROM rfid_lot';
    pool.execute(sql, (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(results);
    });
});

app.get('/all-data', (req, res) => {
    const sql = 'SELECT * FROM time_taken';
    pool.execute(sql, (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(results);
    });
});

app.post('/rfid', (req, res) => {
    const { lot, time } = req.body;
    console.log('Received data:');
    console.log('Lot:', lot);
    console.log('Time:', time);
    // Validate the time format
    if (!/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/.test(time)) {
        return res.status(400).json({ error: 'Invalid time format' });
    }
    
    

    const sql = 'INSERT INTO time_taken (lot, time) VALUES (?, ?)';
    console.log('Parameters:', [lot, time]);
    pool.execute(sql, [lot, time], (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(results);
    });

});



app.post('/time', (req, res) => {
    const {id, phase, date, start_time, end_time, avg_current } = req.body;

    console.log('Received data:');
    console.log('phase:', phase);
    console.log('date:', date);
    console.log('start_time:', start_time);
    console.log('end_time:', end_time);
    console.log('avg_current:', avg_current);

    // Validate the time format (HH:MM:SS)
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/;
    if (!timeRegex.test(start_time) || !timeRegex.test(end_time)) {
        return res.status(400).json({ error: 'Invalid time format' });
    }

    // Validate the date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
        return res.status(400).json({ error: 'Invalid date format' });
    }

    // Validate the average current as a number
    if (isNaN(avg_current)) {
        return res.status(400).json({ error: 'Average current should be a valid number' });
    }

    // SQL query to insert data
    const sql = `INSERT INTO monitor (date,phase, start, end, current,id)
                 VALUES (?, ?, ?, ?, ?,?)`;
    
    // Parameters for SQL query
    const params = [date,phase, start_time, end_time, avg_current,id];
    console.log('SQL Query:', sql);
    console.log('Parameters:', params);

    // Execute query
    pool.execute(sql, params, (err, results) => {
        if (err) {
            console.error('Error executing query:', err);  // Print the error object
            return res.status(500).json({ error: err.message });
        }
        console.log('Query executed successfully:', results);
        res.json(results);
    });
});

// app.listen(port, '0.0.0.0', () => {
//     console.log(`Server running at http://0.0.0.0:${port}`);
// });
const port = process.env.PORT || 3000; // Default to 3000 if PORT is not set

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});

