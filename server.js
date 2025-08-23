const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const XirsysService = require('./lib/xirsys');
const MatchmakingSystem = require('./lib/matchmaking');
const LoggingSystem = require('./lib/logging');
const FeedbackSystem = require('./lib/feedback');

// Charger la configuration privée
let xirsysService = null;
try {
  const secrets = require('./config/secrets');
  xirsysService = new XirsysService(secrets.xirsys);
  console.log('🔑 Configuration Xirsys chargée');
} catch (error) {
  console.warn('⚠️ Configuration Xirsys non trouvée, utilisation des serveurs STUN publics');
}

// Initialiser les systèmes
const matchmaking = new MatchmakingSystem();
const logging = new LoggingSystem();
const feedback = new FeedbackSystem();

console.log('🎯 Système de matchmaking initialisé');
console.log('📝 Système de logs initialisé');
console.log('💬 Système de feedback initialisé');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middleware pour parser le JSON
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Route principale
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Route pour les logs d'administration
app.get('/logs', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'logs.html'));
});

// Route pour les feedbacks d'administration
app.get('/feedbacks', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'feedbacks.html'));
});

// API pour obtenir les logs
app.get('/api/logs', (req, res) => {
  const { type, limit = 100, offset = 0 } = req.query;
  const logs = logging.getLogs({ type, limit: parseInt(limit), offset: parseInt(offset) });
  res.json(logs);
});

// API pour supprimer des logs
app.delete('/api/logs/:id', (req, res) => {
  const success = logging.deleteLog(req.params.id);
  res.json({ success });
});

// API pour exporter les logs en CSV
app.get('/api/logs/export', (req, res) => {
  const { type } = req.query;
  const csv = logging.exportToCSV(type);
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=logs.csv');
  res.send(csv);
});

// API pour obtenir les feedbacks
app.get('/api/feedbacks', (req, res) => {
  const { limit = 50, offset = 0 } = req.query;
  const feedbacks = feedback.getFeedbacks({ limit: parseInt(limit), offset: parseInt(offset) });
  res.json(feedbacks);
});

// API pour ajouter un feedback
app.post('/api/feedbacks', (req, res) => {
  const { rating, comment, pseudo } = req.body;
  const newFeedback = feedback.addFeedback({ rating, comment, pseudo });
  res.json(newFeedback);
});

// API pour exporter les feedbacks en CSV
app.get('/api/feedbacks/export', (req, res) => {
  const csv = feedback.exportToCSV();
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=feedbacks.csv');
  res.send(csv);
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

// Route pour les statistiques de matchmaking
app.get('/api/stats', (req, res) => {
  const stats = matchmaking.getStats();
  const logStats = logging.getStats();
  const feedbackStats = feedback.getStats();
  
  res.json({
    ...stats,
    logs: logStats,
    feedbacks: feedbackStats
  });
});

// Fonctions utilitaires
function notifyMatch(user1Id, user2Id, conversation) {
  const user1State = matchmaking.getUserState(user1Id);
  const user2State = matchmaking.getUserState(user2Id);
  
  // Notifier les deux utilisateurs du match
  io.to(user1State.user.socketId).emit('match-found', {
    partner: user2State.user,
    conversation: conversation,
    state: user1State
  });
  
  io.to(user2State.user.socketId).emit('match-found', {
    partner: user1State.user,
    conversation: conversation,
    state: user2State
  });
  
  // Logger le match
  logging.addLog('match_created', {
    user1: user1State.user.pseudo || user1Id,
    user2: user2State.user.pseudo || user2Id,
    conversationId: conversation.id
  });
  
  console.log(`🎯 Match créé: ${user1Id} ↔ ${user2Id}`);
}

function notifyMatchEnd(userId, reason) {
  const userState = matchmaking.getUserState(userId);
  if (userState && userState.user) {
    io.to(userState.user.socketId).emit('match-ended', {
      reason: reason,
      state: userState
    });
    
    // Logger la fin de conversation
    if (userState.user.conversationId) {
      logging.addLog('conversation_ended', {
        userId: userState.user.pseudo || userId,
        reason: reason,
        conversationId: userState.user.conversationId
      });
    }
  }
}

function broadcastStats() {
  const stats = matchmaking.getStats();
  const logStats = logging.getStats();
  const feedbackStats = feedback.getStats();
  
  io.emit('matchmaking-stats', {
    ...stats,
    logs: logStats,
    feedbacks: feedbackStats
  });
}

// Gestion des connexions WebSocket
io.on('connection', (socket) => {
  console.log('Nouvel utilisateur connecté:', socket.id);
  
  // Logger la connexion
  logging.addLog('user_connected', { socketId: socket.id });
  
  // Ajouter l'utilisateur au système de matchmaking
  const user = matchmaking.addUser(socket.id, socket.id);
  
  // Envoyer l'état initial à l'utilisateur
  const userState = matchmaking.getUserState(socket.id);
  socket.emit('matchmaking-state', userState);
  
  // Vérifier si un match a été créé
  if (userState.user.status === 'in_conversation') {
    const partner = matchmaking.getPartner(socket.id);
    if (partner) {
      const conversation = matchmaking.conversations.get(userState.user.conversationId);
      notifyMatch(socket.id, partner.id, conversation);
    }
  }
  
  // Informer tous les clients des statistiques
  broadcastStats();

  // Mettre à jour le pseudo de l'utilisateur
  socket.on('update-pseudo', (pseudo) => {
    const userState = matchmaking.getUserState(socket.id);
    if (userState) {
      userState.user.pseudo = pseudo;
      logging.addLog('pseudo_updated', { 
        socketId: socket.id, 
        pseudo: pseudo 
      });
    }
  });

  // Gérer les données audio (uniquement entre partenaires)
  socket.on('audio-data', (data) => {
    const partner = matchmaking.getPartner(socket.id);
    if (partner) {
      io.to(partner.socketId).emit('audio-data', data);
    }
  });

  // Gérer les offres/réponses WebRTC (uniquement entre partenaires)
  socket.on('webrtc-offer', (data) => {
    const partner = matchmaking.getPartner(socket.id);
    if (partner) {
      io.to(partner.socketId).emit('webrtc-offer', {
        offer: data.offer,
        senderId: socket.id
      });
    }
  });

  socket.on('webrtc-answer', (data) => {
    const partner = matchmaking.getPartner(socket.id);
    if (partner) {
      io.to(partner.socketId).emit('webrtc-answer', {
        answer: data.answer,
        senderId: socket.id
      });
    }
  });

  socket.on('webrtc-ice-candidate', (data) => {
    const partner = matchmaking.getPartner(socket.id);
    if (partner) {
      io.to(partner.socketId).emit('webrtc-ice-candidate', {
        candidate: data.candidate,
        senderId: socket.id
      });
    }
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

  // Passer à l'utilisateur suivant
  socket.on('next-user', () => {
    console.log(`🔄 ${socket.id} demande l'utilisateur suivant`);
    
    logging.addLog('next_user_requested', { socketId: socket.id });
    
    const currentPartner = matchmaking.getPartner(socket.id);
    if (currentPartner) {
      // Notifier le partenaire que la conversation se termine
      notifyMatchEnd(currentPartner.id, 'partner_next');
    }
    
    // Passer à l'utilisateur suivant
    const newConversation = matchmaking.nextUser(socket.id);
    
    if (newConversation) {
      // Nouveau match trouvé
      const partnerId = newConversation.user1 === socket.id ? newConversation.user2 : newConversation.user1;
      notifyMatch(socket.id, partnerId, newConversation);
    } else {
      // Aucun match, utilisateur en queue
      const userState = matchmaking.getUserState(socket.id);
      socket.emit('matchmaking-state', userState);
    }
    
    broadcastStats();
  });

  // Gérer les signaux de début/fin d'enregistrement
  socket.on('start-recording', () => {
    const partner = matchmaking.getPartner(socket.id);
    if (partner) {
      io.to(partner.socketId).emit('user-speaking', socket.id);
    }
  });

  socket.on('stop-recording', () => {
    const partner = matchmaking.getPartner(socket.id);
    if (partner) {
      io.to(partner.socketId).emit('user-stopped-speaking', socket.id);
    }
  });

  // Marquer l'utilisateur comme prêt pour WebRTC
  socket.on('webrtc-ready', () => {
    const userState = matchmaking.getUserState(socket.id);
    if (userState && userState.partner) {
      // Informer le partenaire que l'utilisateur est prêt pour WebRTC
      io.to(userState.partner.socketId).emit('partner-webrtc-ready', {
        partnerId: socket.id
      });
    }
  });

  // Gérer la déconnexion
  socket.on('disconnect', () => {
    console.log('Utilisateur déconnecté:', socket.id);
    
    logging.addLog('user_disconnected', { socketId: socket.id });
    
    const partner = matchmaking.getPartner(socket.id);
    if (partner) {
      // Notifier le partenaire que l'utilisateur a quitté
      notifyMatchEnd(partner.id, 'partner_left');
    }
    
    // Retirer l'utilisateur du système
    matchmaking.removeUser(socket.id);
    
    // Mettre à jour les statistiques
    broadcastStats();
  });
});

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

server.listen(PORT, HOST, () => {
  console.log(`🚀 Serveur Vocaline démarré sur ${HOST}:${PORT}`);
  console.log(`📱 Accès local: http://localhost:${PORT}`);
  console.log(`📊 Logs: http://localhost:${PORT}/logs`);
  console.log(`💬 Feedbacks: http://localhost:${PORT}/feedbacks`);
  
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
  
  console.log('\n🎯 Vocaline - Plateforme de communication vocale:');
  console.log('   • Matchmaking audio 1-on-1 automatique');
  console.log('   • WebRTC pour communication P2P');
  console.log('   • Système de logs en temps réel');
  console.log('   • Collecte de feedbacks utilisateurs');
  console.log('   • Interface d\'administration complète');
});
