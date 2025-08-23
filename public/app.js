class VoiceChatApp {
    constructor() {
        this.socket = io();
        this.mediaRecorder = null;
        this.audioContext = null;
        this.audioChunks = [];
        this.isRecording = false;
        this.isConnected = false;
        this.webrtcManager = null;
        this.useWebRTC = false;
        this.userPseudo = '';
        this.stats = {
            connectedUsers: 0,
            waitingUsers: 0,
            activeConversations: 0,
            totalFeedbacks: 0
        };
        
        this.initializeElements();
        this.setupEventListeners();
        this.setupSocketListeners();
        this.initializeAudio();
        this.loadStats();
        
        // Exposer l'instance globalement pour WebRTC
        window.voiceChatApp = this;
    }

    initializeElements() {
        // Éléments existants
        this.recordBtn = document.getElementById('record-btn');
        this.connectionStatus = document.getElementById('connection-status');
        this.usersCount = document.getElementById('users-count');
        this.readyStatus = document.getElementById('ready-status');
        this.recordingIndicator = document.getElementById('recording-indicator');
        this.volumeSlider = document.getElementById('volume');
        this.volumeValue = document.getElementById('volume-value');
        this.messages = document.getElementById('messages');
        this.webrtcBtn = document.getElementById('webrtc-btn');
        this.nextUserBtn = document.getElementById('next-user-btn');
        
        // Nouveaux éléments pour Vocaline
        this.pseudoSection = document.getElementById('pseudo-section');
        this.pseudoInput = document.getElementById('pseudo-input');
        this.pseudoBtn = document.getElementById('pseudo-btn');
        this.statsSection = document.getElementById('stats-section');
        this.chatArea = document.getElementById('chat-area');
        this.feedbackSection = document.getElementById('feedback-section');
        
        // Éléments de statistiques
        this.connectedUsersEl = document.getElementById('connected-users');
        this.waitingUsersEl = document.getElementById('waiting-users');
        this.activeConversationsEl = document.getElementById('active-conversations');
        this.totalFeedbacksEl = document.getElementById('total-feedbacks');
        
        // Éléments de feedback
        this.feedbackBtn = document.getElementById('feedback-btn');
        this.feedbackComment = document.getElementById('feedback-comment');
        this.ratingInputs = document.querySelectorAll('input[name="rating"]');
        
        // Variables pour matchmaking
        this.currentPartner = null;
        this.userState = null;
        this.isInConversation = false;
    }

    setupEventListeners() {
        // Gestion du pseudo
        this.pseudoBtn.addEventListener('click', () => this.setPseudo());
        this.pseudoInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.setPseudo();
            }
        });

        // Bouton d'enregistrement - maintenir appuyé
        this.recordBtn.addEventListener('mousedown', (e) => {
            e.preventDefault();
            this.startRecording();
        });

        this.recordBtn.addEventListener('mouseup', (e) => {
            e.preventDefault();
            this.stopRecording();
        });

        this.recordBtn.addEventListener('mouseleave', (e) => {
            if (this.isRecording) {
                this.stopRecording();
            }
        });

        // Support tactile pour mobile
        this.recordBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.startRecording();
        });

        this.recordBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.stopRecording();
        });

        // Contrôle du volume
        this.volumeSlider.addEventListener('input', (e) => {
            const volume = e.target.value;
            this.volumeValue.textContent = volume + '%';
            this.updateVolume(volume / 100);
        });

        // Empêcher la sélection du texte sur le bouton
        this.recordBtn.addEventListener('selectstart', (e) => e.preventDefault());

        // Bouton WebRTC (maintenant bouton "Utilisateur suivant")
        this.webrtcBtn.addEventListener('click', () => {
            if (this.isInConversation) {
                this.nextUser();
            } else {
                this.startWebRTCCall();
            }
        });

        // Bouton utilisateur suivant
        if (this.nextUserBtn) {
            this.nextUserBtn.addEventListener('click', () => this.nextUser());
        }

        // Gestion du feedback
        this.feedbackBtn.addEventListener('click', () => this.submitFeedback());
    }

    setPseudo() {
        const pseudo = this.pseudoInput.value.trim();
        if (pseudo.length < 2) {
            alert('Le pseudo doit contenir au moins 2 caractères');
            return;
        }
        
        this.userPseudo = pseudo;
        this.socket.emit('update-pseudo', pseudo);
        
        // Masquer la section pseudo et afficher le chat
        this.pseudoSection.style.display = 'none';
        this.chatArea.style.display = 'flex';
        
        this.addMessage('Système', `Pseudo défini: ${pseudo}`, 'system');
        this.readyStatus.textContent = 'Prêt pour le matchmaking';
    }

    async submitFeedback() {
        const rating = document.querySelector('input[name="rating"]:checked');
        if (!rating) {
            alert('Veuillez sélectionner une note');
            return;
        }

        const comment = this.feedbackComment.value.trim();
        
        try {
            const response = await fetch('/api/feedbacks', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    rating: parseInt(rating.value),
                    comment: comment,
                    pseudo: this.userPseudo || 'Anonyme'
                })
            });

            if (response.ok) {
                alert('Merci pour votre feedback !');
                this.feedbackComment.value = '';
                rating.checked = false;
                this.loadStats(); // Recharger les statistiques
            } else {
                alert('Erreur lors de l\'envoi du feedback');
            }
        } catch (error) {
            console.error('Erreur feedback:', error);
            alert('Erreur lors de l\'envoi du feedback');
        }
    }

    async loadStats() {
        try {
            const response = await fetch('/api/stats');
            const stats = await response.json();
            
            this.stats = {
                connectedUsers: stats.totalUsers || 0,
                waitingUsers: stats.usersInQueue || 0,
                activeConversations: stats.activeConversations || 0,
                totalFeedbacks: stats.feedbacks?.total || 0
            };
            
            this.updateStatsDisplay();
        } catch (error) {
            console.error('Erreur chargement stats:', error);
        }
    }

    updateStatsDisplay() {
        if (this.connectedUsersEl) this.connectedUsersEl.textContent = this.stats.connectedUsers;
        if (this.waitingUsersEl) this.waitingUsersEl.textContent = this.stats.waitingUsers;
        if (this.activeConversationsEl) this.activeConversationsEl.textContent = this.stats.activeConversations;
        if (this.totalFeedbacksEl) this.totalFeedbacksEl.textContent = this.stats.totalFeedbacks;
    }

    setupSocketListeners() {
        this.socket.on('connect', () => {
            console.log('Connecté au serveur');
            this.isConnected = true;
            this.connectionStatus.textContent = 'Connecté';
            this.connectionStatus.className = 'status-online';
            this.recordBtn.disabled = false;
            this.socket.emit('user-ready');
        });

        this.socket.on('disconnect', () => {
            console.log('Déconnecté du serveur');
            this.isConnected = false;
            this.connectionStatus.textContent = 'Déconnecté';
            this.connectionStatus.className = 'status-offline';
            this.recordBtn.disabled = true;
            this.readyStatus.textContent = 'Déconnecté';
        });

        this.socket.on('matchmaking-stats', (stats) => {
            this.stats = {
                connectedUsers: stats.totalUsers || 0,
                waitingUsers: stats.usersInQueue || 0,
                activeConversations: stats.activeConversations || 0,
                totalFeedbacks: stats.feedbacks?.total || 0
            };
            this.updateStatsDisplay();
            this.usersCount.textContent = `${stats.totalUsers || 0} utilisateur(s) connecté(s)`;
        });

        this.socket.on('matchmaking-state', (state) => {
            this.userState = state;
            this.updateMatchmakingState(state);
        });

        this.socket.on('match-found', (data) => {
            this.currentPartner = data.partner;
            this.isInConversation = true;
            
            const partnerName = data.partner.pseudo || 'Utilisateur';
            this.addMessage('Système', `🎯 Match trouvé avec ${partnerName} !`, 'system');
            this.readyStatus.textContent = `En conversation avec ${partnerName}`;
            
            // Afficher le bouton "Utilisateur suivant"
            if (this.nextUserBtn) {
                this.nextUserBtn.style.display = 'flex';
            }
            
            // Initialiser WebRTC si disponible
            if (window.webrtcManager) {
                window.webrtcManager.initializeConnection(data.partner.id);
            }
        });

        this.socket.on('match-ended', (data) => {
            this.currentPartner = null;
            this.isInConversation = false;
            
            let reason = 'Conversation terminée';
            switch (data.reason) {
                case 'partner_left':
                    reason = 'L\'autre utilisateur a quitté';
                    break;
                case 'partner_next':
                    reason = 'L\'autre utilisateur a changé';
                    break;
                case 'user_left':
                    reason = 'Vous avez quitté';
                    break;
            }
            
            this.addMessage('Système', reason, 'system');
            this.readyStatus.textContent = 'En attente de match...';
            
            // Masquer le bouton "Utilisateur suivant"
            if (this.nextUserBtn) {
                this.nextUserBtn.style.display = 'none';
            }
            
            // Fermer la connexion WebRTC
            if (window.webrtcManager) {
                window.webrtcManager.closeConnection();
            }
        });

        this.socket.on('user-speaking', (userId) => {
            this.addMessage('Système', '🎤 L\'autre utilisateur parle...', 'system');
        });

        this.socket.on('user-stopped-speaking', (userId) => {
            this.addMessage('Système', '🔇 L\'autre utilisateur a arrêté de parler', 'system');
        });

        this.socket.on('partner-webrtc-ready', (data) => {
            if (window.webrtcManager) {
                window.webrtcManager.onPartnerReady(data.partnerId);
            }
        });

        // Événements WebRTC
        this.socket.on('webrtc-offer', (data) => {
            if (window.webrtcManager) {
                window.webrtcManager.handleOffer(data.offer, data.senderId);
            }
        });

        this.socket.on('webrtc-answer', (data) => {
            if (window.webrtcManager) {
                window.webrtcManager.handleAnswer(data.answer, data.senderId);
            }
        });

        this.socket.on('webrtc-ice-candidate', (data) => {
            if (window.webrtcManager) {
                window.webrtcManager.handleIceCandidate(data.candidate, data.senderId);
            }
        });

        this.socket.on('ice-config', (data) => {
            if (data.success && window.webrtcManager) {
                window.webrtcManager.setIceConfig(data.config);
            }
        });
    }

    updateMatchmakingState(state) {
        if (!state) return;
        
        switch (state.user.status) {
            case 'available':
                this.readyStatus.textContent = 'En attente de match...';
                break;
            case 'in_queue':
                this.readyStatus.textContent = 'En file d\'attente...';
                break;
            case 'in_conversation':
                this.readyStatus.textContent = 'En conversation...';
                this.isInConversation = true;
                break;
        }
    }

    nextUser() {
        if (!this.isInConversation) return;
        
        this.socket.emit('next-user');
        this.addMessage('Système', '🔄 Demande de changement d\'utilisateur...', 'system');
    }

    startWebRTCCall() {
        this.addMessage('Système', '🌐 Initialisation WebRTC...', 'system');
        this.socket.emit('request-ice-config');
    }

    startRecording() {
        if (!this.isConnected || this.isRecording) return;
        
        this.isRecording = true;
        this.recordBtn.classList.add('recording');
        this.recordingIndicator.classList.add('show');
        
        if (this.mediaRecorder && this.mediaRecorder.state === 'inactive') {
            this.mediaRecorder.start();
        }
        
        this.socket.emit('start-recording');
    }

    stopRecording() {
        if (!this.isRecording) return;
        
        this.isRecording = false;
        this.recordBtn.classList.remove('recording');
        this.recordingIndicator.classList.remove('show');
        
        if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
            this.mediaRecorder.stop();
        }
        
        this.socket.emit('stop-recording');
    }

    addMessage(sender, text, type = 'message') {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        
        const timestamp = new Date().toLocaleTimeString('fr-FR', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        
        messageDiv.innerHTML = `
            <div class="message-header">
                <span class="message-sender">${sender}</span>
                <span class="message-time">${timestamp}</span>
            </div>
            <div class="message-content">${text}</div>
        `;
        
        this.messages.appendChild(messageDiv);
        this.messages.scrollTop = this.messages.scrollHeight;
    }

    updateVolume(volume) {
        if (this.audioContext) {
            this.audioContext.gain.gain.value = volume;
        }
    }

    async initializeAudio() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                } 
            });
            
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const source = this.audioContext.createMediaStreamSource(stream);
            const gain = this.audioContext.createGain();
            
            source.connect(gain);
            gain.connect(this.audioContext.destination);
            
            this.audioContext.gain = gain;
            this.updateVolume(this.volumeSlider.value / 100);
            
            this.mediaRecorder = new MediaRecorder(stream, {
                mimeType: 'audio/webm;codecs=opus'
            });
            
            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.socket.emit('audio-data', {
                        audio: event.data,
                        timestamp: Date.now()
                    });
                }
            };
            
            this.recordBtn.disabled = false;
            this.addMessage('Système', '🎤 Microphone activé', 'system');
            
        } catch (error) {
            console.error('Erreur accès microphone:', error);
            this.addMessage('Système', '❌ Erreur accès microphone', 'error');
            this.recordBtn.disabled = true;
        }
    }
}

// Initialiser l'application quand le DOM est chargé
document.addEventListener('DOMContentLoaded', () => {
    new VoiceChatApp();
});