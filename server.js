const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2');
const cors = require('cors');

const app = express();
const port = 3000;

app.use(cors());

// Create a MySQL connection pool
const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'garments_timer',
  });

// Parse application/json
app.use(bodyParser.json());





// Route definitions
app.post('/update', (req, res) => {
    const { machineId, pieces } = req.body;
    console.log('Received data:', req.body);
    res.json({ message: 'Update route is working', machineId, pieces });
});





// Other routes like /data, /test, etc.



// // POST /update route
// app.post('/update', (req, res) => {
//     console.log('update working:');

//     const { machineId, pieces } = req.body;

//     // Log the received data
//     console.log('Received data:');
//     console.log('Machine ID:', machineId);
//     console.log('Pieces sewn:', pieces);

//     // Query to update the pieces sewn by the device
//     const sql = 'UPDATE device SET pieces = pieces + ? WHERE id = ?';
//     pool.execute(sql, [pieces, machineId], (err, results) => {
//         if (err) {
//             console.error('Database error:', err);
//             return res.status(500).json({ error: 'Database error: ' + err.message });
//         }

//         // Log the result of the update operation
//         console.log('Update results:', results);

//         // Check if rows were affected
//         if (results.affectedRows > 0) {
//             return res.json({ message: 'Database updated successfully', machineId: machineId, pieces: pieces });
//         } else {
//             return res.status(404).json({ message: 'Machine not found or no update was made.' });
//         }
//     });
// });


app.post('/data', (req, res) => {
    const { uid, access } = req.body;
    console.log('Received data:');
    console.log('UID:', uid);
    console.log('Access:', access);

    const sql = 'SELECT * FROM rfid_lot WHERE rfid = ?';
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
            return res.json({ lot: lotNumber }); // Wrap the lot number in an object
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
  
  // POST endpoint
  app.post('/time', (req, res) => {
    console.log('Received data:', req.body);
    res.send('Data received');
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
})

app.post('/time', (req, res) => {
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

})





// Start the server to listen on all network interfaces
app.listen(port, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${port}`);
});
