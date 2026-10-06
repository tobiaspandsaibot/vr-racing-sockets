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

io.on('connection', (socket) => {
  console.log('Cliente conectado:', socket.id);

  // 1. Crear sala desde la PC
  socket.on('create-room', () => {
    const pin = Math.floor(1000 + Math.random() * 9000).toString();
    socket.join(pin);
    socket.emit('room-created', pin);
    console.log(`Sala creada con PIN: ${pin}`);
  });

  // 2. Unir el Celular a la sala
  socket.on('join-room', (pin) => {
    const room = io.sockets.adapter.rooms.get(pin);
    
    // Verificar si la sala existe (si la PC creó el PIN)
    if (room && room.size > 0) {
      socket.join(pin);
      
      // Confirmación al Celular
      socket.emit('joined-success');
      
      // Notificar a TODOS en la sala (incluyendo la PC) que el visor se conectó
      io.to(pin).emit('visor-connected');
      console.log(`Visor unido exitosamente al PIN: ${pin}`);
    } else {
      socket.emit('error-message', 'El PIN no existe o la sala de la PC se cerró.');
    }
  });

  // 3. Transmitir los controles del Joystick/Teclado al Celular
  socket.on('gamepad-input', (data) => {
    if (data && data.pin) {
      const payload = data.inputs || data.input || data;
      // Retransmite los datos a la sala del PIN
      socket.to(data.pin).emit('gamepad-update', payload);
    }
  });

  socket.on('disconnect', () => {
    console.log('Cliente desconectado:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Servidor de Socket.io activo en puerto ${PORT}`);
});
