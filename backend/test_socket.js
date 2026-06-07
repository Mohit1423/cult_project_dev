const { io } = require('socket.io-client');
const jwt = require('jsonwebtoken');

const token = jwt.sign({ id: '17eef2bc-5c38-4075-ac8f-9cc4064bb38b', role: 'DRIVER' }, 'local_development_secret_key');

const socket = io('http://localhost:5001', {
  auth: { token }
});

socket.on('connect', () => {
  console.log('Connected to backend!');
  socket.emit('driver_go_online', (res) => {
    console.log('Got response for driver_go_online:', res);
    socket.disconnect();
    process.exit(0);
  });
});

socket.on('connect_error', (err) => {
  console.log('Connect Error:', err.message);
  process.exit(1);
});
