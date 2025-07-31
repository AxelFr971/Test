const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const XirsysService = require('./lib/xirsys');

// Charger la configuration privée
let xirsysService = null;
try {
  const secrets = require('./config/secrets');
  xirsysService = new XirsysService(secrets.xirsys);
  console.log('🔑 Configuration Xirsys chargée');
} catch (error) {
  console.warn('⚠️ Configuration Xirsys non trouvée, utilisation des serveurs STUN publics');
}

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

// Route pour obtenir la configuration ICE
app.get('/api/ice-config', async (req, res) => {
  try {
    if (xirsysService) {
      const config = await xirsysService.getIceConfigWithFallback();
      res.json({
        success: true,
        config: config,
        provider: 'xirsys'
      });
    } else {
      // Configuration de fallback
      res.json({
        success: true,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
          ],
          iceTransportPolicy: 'all'
        },
        provider: 'fallback'
      });
    }
  } catch (error) {
    console.error('❌ Erreur récupération config ICE:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur serveur ICE'
    });
  }
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

  // Gérer les offres/réponses WebRTC
  socket.on('webrtc-offer', (data) => {
    socket.broadcast.emit('webrtc-offer', {
      offer: data.offer,
      senderId: socket.id
    });
  });

  socket.on('webrtc-answer', (data) => {
    socket.broadcast.emit('webrtc-answer', {
      answer: data.answer,
      senderId: socket.id
    });
  });

  socket.on('webrtc-ice-candidate', (data) => {
    socket.broadcast.emit('webrtc-ice-candidate', {
      candidate: data.candidate,
      senderId: socket.id
    });
  });

  // Demande de configuration ICE
  socket.on('request-ice-config', async () => {
    try {
      if (xirsysService) {
        const config = await xirsysService.getIceConfigWithFallback(socket.id);
        socket.emit('ice-config', {
          success: true,
          config: config,
          provider: 'xirsys'
        });
      } else {
        socket.emit('ice-config', {
          success: true,
          config: {
            iceServers: [
              { urls: 'stun:stun.l.google.com:19302' },
              { urls: 'stun:stun1.l.google.com:19302' }
            ],
            iceTransportPolicy: 'all'
          },
          provider: 'fallback'
        });
      }
    } catch (error) {
      socket.emit('ice-config', {
        success: false,
        error: 'Erreur serveur ICE'
      });
    }
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