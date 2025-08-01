const express = require('express');
const https = require('https');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const fs = require('fs');

const app = express();

// Configuration HTTPS
const useHttps = process.env.HTTPS === 'true' || process.env.SSL_KEY;
let server;

if (useHttps) {
  try {
    // Vérifier si les certificats existent
    const keyPath = process.env.SSL_KEY || './certs/key.pem';
    const certPath = process.env.SSL_CERT || './certs/cert.pem';
    
    if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
      const options = {
        key: fs.readFileSync(keyPath),
        cert: fs.readFileSync(certPath)
      };
      
      server = https.createServer(options, app);
      console.log('🔒 Serveur HTTPS configuré');
    } else {
      console.log('⚠️ Certificats SSL non trouvés, passage en HTTP');
      console.log('💡 Pour générer des certificats: npm run generate-certs');
      server = http.createServer(app);
    }
  } catch (error) {
    console.error('❌ Erreur lors de la configuration HTTPS:', error.message);
    server = http.createServer(app);
  }
} else {
  server = http.createServer(app);
}

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

// Route de diagnostic
app.get('/debug', (req, res) => {
  const info = {
    timestamp: new Date().toISOString(),
    headers: req.headers,
    ip: req.ip || req.connection.remoteAddress,
    protocol: req.protocol,
    secure: req.secure,
    url: req.url,
    userAgent: req.get('User-Agent'),
    server: {
      https: useHttps,
      port: PORT,
      host: HOST
    }
  };
  
  res.json(info);
});

// Gestion des connexions WebSocket
let connectedUsers = [];

io.on('connection', (socket) => {
  console.log('Nouvel utilisateur connecté:', socket.id);
  
  // Ajouter l'utilisateur à la liste
  connectedUsers.push({
    id: socket.id,
    ready: false,
    connectedAt: new Date()
  });

  // Informer tous les clients du nombre d'utilisateurs connectés
  io.emit('users-count', connectedUsers.length);

  // Diagnostic de connexion
  socket.emit('connection-info', {
    secure: server instanceof https.Server,
    protocol: server instanceof https.Server ? 'https' : 'http'
  });

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

  // Test de connectivité audio
  socket.on('test-audio', (data) => {
    socket.emit('audio-test-result', {
      received: true,
      timestamp: new Date().toISOString(),
      size: data.length || 0
    });
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

const PORT = process.env.PORT || (useHttps ? 3443 : 3000);
const HOST = process.env.HOST || '0.0.0.0';

server.listen(PORT, HOST, () => {
  const protocol = server instanceof https.Server ? 'https' : 'http';
  console.log(`🚀 Serveur démarré sur ${HOST}:${PORT} (${protocol.toUpperCase()})`);
  console.log(`📱 Accès local: ${protocol}://localhost:${PORT}`);
  
  // Afficher les adresses IP disponibles
  const networkInterfaces = require('os').networkInterfaces();
  console.log('\n📡 Accès réseau disponibles:');
  
  Object.keys(networkInterfaces).forEach(interfaceName => {
    networkInterfaces[interfaceName].forEach(iface => {
      if (iface.family === 'IPv4' && !iface.internal) {
        console.log(`   ${interfaceName}: ${protocol}://${iface.address}:${PORT}`);
      }
    });
  });
  
  if (server instanceof https.Server) {
    console.log('\n🔒 HTTPS activé - Accès microphone autorisé sur tous les réseaux');
  } else {
    console.log('\n⚠️  HTTP - Accès microphone limité aux connexions locales');
    console.log('💡 Pour activer HTTPS: npm run https ou HTTPS=true npm start');
  }
  
  console.log('\n🛠️  Diagnostic disponible sur: ' + protocol + '://localhost:' + PORT + '/debug');
});