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
  console.log('Nuevo cliente conectado:', socket.id);

  // PC genera sala
  socket.on('create-room', () => {
    const pin = String(Math.floor(1000 + Math.random() * 9000));
    socket.join(pin);
    socket.emit('room-created', pin);
    console.log(`[PC] Sala creada PIN: ${pin}`);
  });

  // Celular intenta ingresar PIN
  socket.on('join-room', (rawPin) => {
    const pin = String(rawPin).trim();
    console.log(`[CELULAR] Petición para unirse al PIN: ${pin}`);

    // Unir socket del celular a la sala
    socket.join(pin);

    // Avisar al celular que la unión fue exitosa
    socket.emit('joined-success');

    // Notificar A TODOS en la sala (PC incluida)
    io.to(pin).emit('visor-connected');
    console.log(`[OK] Visor sincronizado en sala: ${pin}`);
  });

  // Reenviar datos del mando (PC -> Celular)
  socket.on('gamepad-input', (data) => {
    if (data && data.pin) {
      const pin = String(data.pin).trim();
      const payload = data.inputs || data.input || data;
      // Emitir a todos en la sala menos al emisor (PC)
      socket.to(pin).emit('gamepad-update', payload);
    }
  });

  socket.on('disconnect', () => {
    console.log('Cliente desconectado:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Servidor de Sockets activo en puerto ${PORT}`);
});
