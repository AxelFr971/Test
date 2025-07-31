const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Servir les fichiers statiques
app.use(express.static(path.join(__dirname, 'public')));

// Route principale
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Gestion des connexions WebSocket
let connectedUsers = [];

io.on('connection', (socket) => {
  console.log('Nouvel utilisateur connecté:', socket.id);
  
  // Ajouter l'utilisateur à la liste
  connectedUsers.push({
    id: socket.id,
    ready: false
  });

  // Informer tous les clients du nombre d'utilisateurs connectés
  io.emit('users-count', connectedUsers.length);

  // Gérer les données audio
  socket.on('audio-data', (data) => {
    // Retransmettre les données audio à tous les autres clients
    socket.broadcast.emit('audio-data', data);
  });

  // Gérer l'état de préparation de l'utilisateur
  socket.on('user-ready', () => {
    const user = connectedUsers.find(u => u.id === socket.id);
    if (user) {
      user.ready = true;
      const readyUsers = connectedUsers.filter(u => u.ready).length;
      io.emit('ready-users', readyUsers);
    }
  });

  // Gérer les signaux de début/fin d'enregistrement
  socket.on('start-recording', () => {
    socket.broadcast.emit('user-speaking', socket.id);
  });

  socket.on('stop-recording', () => {
    socket.broadcast.emit('user-stopped-speaking', socket.id);
  });

  // Gérer la déconnexion
  socket.on('disconnect', () => {
    console.log('Utilisateur déconnecté:', socket.id);
    connectedUsers = connectedUsers.filter(u => u.id !== socket.id);
    io.emit('users-count', connectedUsers.length);
    const readyUsers = connectedUsers.filter(u => u.ready).length;
    io.emit('ready-users', readyUsers);
  });
});

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

server.listen(PORT, HOST, () => {
  console.log(`Serveur démarré sur ${HOST}:${PORT}`);
  console.log(`Accès local: http://localhost:${PORT}`);
  
  // Afficher les adresses IP disponibles
  const networkInterfaces = require('os').networkInterfaces();
  console.log('\n📡 Accès réseau disponibles:');
  
  Object.keys(networkInterfaces).forEach(interfaceName => {
    networkInterfaces[interfaceName].forEach(iface => {
      if (iface.family === 'IPv4' && !iface.internal) {
        console.log(`   ${interfaceName}: http://${iface.address}:${PORT}`);
      }
    });
  });
  
  console.log('\n💡 Pour accéder depuis un autre appareil:');
  console.log('   1. Connectez-vous au même réseau WiFi');
  console.log('   2. Utilisez une des adresses IP ci-dessus');
  console.log('   3. Ou configurez le port forwarding pour l\'accès externe');
});