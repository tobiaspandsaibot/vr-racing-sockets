const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const rooms = {};

io.on('connection', (socket) => {

  // La PC genera la sala
  socket.on('create-room', () => {
    const pin = Math.floor(1000 + Math.random() * 9000).toString();
    rooms[pin] = { pcSocket: socket.id, visorSocket: null };
    socket.join(pin);
    socket.emit('room-created', pin);
  });

  // El Celular ingresa el PIN
  socket.on('join-room', (pin) => {
    if (rooms[pin]) {
      rooms[pin].visorSocket = socket.id;
      socket.join(pin);
      
      // Notificar al celular y a la PC
      socket.emit('joined-success');
      io.to(rooms[pin].pcSocket).emit('visor-connected');
    } else {
      socket.emit('error-message', 'PIN no encontrado o expiro');
    }
  });

  // Reenviar datos del Joystick de la PC al celular
  socket.on('gamepad-input', (data) => {
    if (data && data.pin) {
      const payload = data.inputs || data.input || data;
      // Retransmitir a los clientes conectados a esa sala
      io.to(data.pin).emit('gamepad-update', payload);
    }
  });

  socket.on('disconnect', () => {});
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server corriendo en puerto ${PORT}`);
});
