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

// Guardar referencias de salas
const rooms = {};

io.on('connection', (socket) => {
  console.log('Cliente conectado:', socket.id);

  // 1. La PC crea la sala y recibe un PIN de 4 dígitos
  socket.on('create-room', () => {
    const pin = Math.floor(1000 + Math.random() * 9000).toString();
    rooms[pin] = { pcSocket: socket.id, visorSocket: null };
    
    socket.join(pin);
    socket.emit('room-created', pin);
    console.log(`Sala creada con PIN: ${pin}`);
  });

  // 2. El Celular se une a la sala ingresando el PIN
  socket.on('join-room', (pin) => {
    if (rooms[pin]) {
      rooms[pin].visorSocket = socket.id;
      socket.join(pin);
      
      // Confirmar al celular que se unió exitosamente
      socket.emit('joined-success');
      
      // Avisar a la PC que el visor se conectó
      io.to(rooms[pin].pcSocket).emit('visor-connected');
      console.log(`Visor unido a la sala: ${pin}`);
    } else {
      socket.emit('error-message', 'PIN no encontrado o sala caducada');
    }
  });

  // 3. Reordenar y reenviar los datos del joystick/teclado de la PC al celular
  socket.on('gamepad-input', (data) => {
    if (data && data.pin) {
      const payload = data.inputs || data.input || data;
      // Emitir 'gamepad-update' a todos en la sala del PIN (incluyendo el celular)
      io.to(data.pin).emit('gamepad-update', payload);
    }
  });

  socket.on('disconnect', () => {
    console.log('Cliente desconectado:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Servidor de Sockets corriendo en puerto ${PORT}`);
});
