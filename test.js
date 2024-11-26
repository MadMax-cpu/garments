import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
    vus: 1400,  // Number of virtual users
    duration: '60s',  // Duration of the test
};

export default function () {
    const id = Math.floor(Math.random() * 1000) + 1;  // Generate a random ID
    const now = new Date();
    const start_time = now.toISOString().slice(11, 19);  // Current time (HH:MM:SS)
    const end_time = new Date(now.getTime() + 1000).toISOString().slice(11, 19);  // Time after 1 second
    const avg_current = (Math.random() * (0.5 - 0.3) + 0.3).toFixed(6);  // Random current value

    const payload = JSON.stringify({
        id: id,
        phase: "sewing",
        date: now.toISOString().split('T')[0],  // Current date (YYYY-MM-DD)
        start_time: start_time,
        end_time: end_time,
        avg_current: avg_current,
    });

    const res = http.post('http://192.168.0.117:3000/time', payload, {
        headers: { 'Content-Type': 'application/json' },
    });

    check(res, {
        'is status 200': (r) => r.status === 200,  // Check if the response status is 200
    });

    sleep(1);  // Sleep for 1 second
}
