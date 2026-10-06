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

  // 1. La PC crea la sala
  socket.on('create-room', () => {
    const pin = Math.floor(1000 + Math.random() * 9000).toString();
    socket.join(pin);
    socket.emit('room-created', pin);
    console.log(`Sala creada con PIN: ${pin}`);
  });

  // 2. El Celular ingresa el PIN
  socket.on('join-room', (pin, callback) => {
    // Forzamos la unión del socket a la sala del PIN
    socket.join(pin);
    console.log(`Visor intentando unirse a PIN: ${pin}`);

    // Avisamos a la PC en la sala que el visor se conectó
    io.to(pin).emit('visor-connected');

    // Confirmamos al celular directamente si usó callback, o por evento estándar
    if (typeof callback === 'function') {
      callback({ status: 'ok' });
    }
    socket.emit('joined-success');
  });

  // 3. La PC retransmite el joystick al celular
  socket.on('gamepad-input', (data) => {
    if (data && data.pin) {
      const payload = data.inputs || data.input || data;
      // Enviamos a TODOS los demás miembros conectados a la sala del PIN
      socket.broadcast.to(data.pin).emit('gamepad-update', payload);
    }
  });

  socket.on('disconnect', () => {
    console.log('Cliente desconectado:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Servidor escuchando en puerto ${PORT}`);
});
