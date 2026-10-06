const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

io.on('connection', (socket) => {
  console.log('Cliente conectado:', socket.id);

  // 1. Crear Sala (PC)
  socket.on('create-room', () => {
    const pin = String(Math.floor(1000 + Math.random() * 9000));
    socket.join(pin);
    socket.emit('room-created', pin);
    console.log(`Sala creada con PIN: ${pin}`);
  });

  // 2. Unirse a Sala (Celular)
  socket.on('join-room', (rawPin) => {
    const pin = String(rawPin).trim();
    const room = io.sockets.adapter.rooms.get(pin);

    // Verificar si existe la sala de la PC
    if (room && room.size > 0) {
      socket.join(pin);
      socket.emit('joined-success');
      // Avisar a la PC que el visor se unió
      io.to(pin).emit('visor-connected');
      console.log(`Visor unido correctamente al PIN: ${pin}`);
    } else {
      socket.emit('error-message', 'PIN no encontrado o sala inactiva');
    }
  });

  // 3. Transmitir Joystick (PC -> Celular)
  socket.on('gamepad-input', (data) => {
    if (data && data.pin) {
      const pin = String(data.pin).trim();
      const payload = data.inputs || data.input || data;
      // Emitir a todos en la sala EXCEPTO a la PC que emite
      socket.to(pin).emit('gamepad-update', payload);
    }
  });

  socket.on('disconnect', () => {
    console.log('Cliente desconectado:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Servidor activo en puerto ${PORT}`);
});
