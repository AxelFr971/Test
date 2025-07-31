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
        
        this.initializeElements();
        this.setupEventListeners();
        this.setupSocketListeners();
        this.initializeAudio();
        
        // Exposer l'instance globalement pour WebRTC
        window.voiceChatApp = this;
    }

    initializeElements() {
        this.recordBtn = document.getElementById('record-btn');
        this.connectionStatus = document.getElementById('connection-status');
        this.usersCount = document.getElementById('users-count');
        this.readyStatus = document.getElementById('ready-status');
        this.recordingIndicator = document.getElementById('recording-indicator');
        this.volumeSlider = document.getElementById('volume');
        this.volumeValue = document.getElementById('volume-value');
        this.messages = document.getElementById('messages');
        this.webrtcBtn = document.getElementById('webrtc-btn');
        
        // Variables pour matchmaking
        this.currentPartner = null;
        this.userState = null;
        this.isInConversation = false;
    }

    setupEventListeners() {
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
        });

        // État du matchmaking
        this.socket.on('matchmaking-state', (state) => {
            this.userState = state;
            this.updateMatchmakingUI();
        });

        // Statistiques du matchmaking
        this.socket.on('matchmaking-stats', (stats) => {
            this.updateStats(stats);
        });

        // Match trouvé
        this.socket.on('match-found', (data) => {
            console.log('🎯 Match trouvé avec:', data.partner.id);
            this.currentPartner = data.partner;
            this.isInConversation = true;
            
            this.addSystemMessage('🎉 Partenaire trouvé ! WebRTC activé automatiquement');
            this.recordBtn.disabled = false;
            
            if (this.webrtcBtn) {
                this.webrtcBtn.style.display = 'none'; // WebRTC auto
            }

            // Démarrer automatiquement WebRTC
            setTimeout(() => {
                this.initializeAndStartWebRTC();
            }, 1000);
        });

        // Match terminé
        this.socket.on('match-ended', (data) => {
            console.log('💔 Match terminé:', data.reason);
            
            let message = 'Conversation terminée';
            switch (data.reason) {
                case 'partner_left':
                    message = 'Votre partenaire a quitté';
                    break;
                case 'partner_next':
                    message = 'Votre partenaire passe au suivant';
                    break;
            }
            
            this.addSystemMessage(message, 'warning');
            this.resetConversation();
        });

        this.socket.on('audio-data', (audioData) => {
            // Utiliser Socket.IO si WebRTC n'est pas connecté
            if (!this.webrtcManager || !this.webrtcManager.isWebRTCConnected()) {
                this.playReceivedAudio(audioData);
            }
        });

        this.socket.on('user-speaking', (userId) => {
            this.addSystemMessage('Votre correspondant parle...');
        });

        this.socket.on('user-stopped-speaking', (userId) => {
            // Message optionnel quand l'autre utilisateur arrête de parler
        });
    }

    async initializeAudio() {
        // Vérifier le contexte de sécurité
        this.checkSecurityContext();
        
        try {
            // Vérifier si getUserMedia est disponible
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error('getUserMedia non supporté par ce navigateur');
            }

            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    sampleRate: 44100
                } 
            });
            
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.microphone = this.audioContext.createMediaStreamSource(stream);
            
            console.log('Audio initialisé avec succès');
            this.addSystemMessage('Microphone activé avec succès');
            
            // Arrêter le stream initial pour économiser les ressources
            stream.getTracks().forEach(track => track.stop());
            
        } catch (error) {
            console.error('Erreur d\'accès au microphone:', error);
            this.handleAudioError(error);
        }
    }

    checkSecurityContext() {
        const isSecure = location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1';
        
        if (!isSecure) {
            console.warn('⚠️ Contexte non-sécurisé détecté');
            this.addSystemMessage('⚠️ Accès microphone limité sur HTTP. Utilisez HTTPS pour un accès complet.', 'warning');
        }

        console.log('🔒 Contexte de sécurité:', {
            protocol: location.protocol,
            hostname: location.hostname,
            isSecure: isSecure
        });
    }

    handleAudioError(error) {
        let message = 'Erreur d\'accès au microphone.';
        let solution = '';

        switch (error.name) {
            case 'NotAllowedError':
            case 'PermissionDeniedError':
                message = 'Accès au microphone refusé.';
                solution = 'Cliquez sur l\'icône 🔒 dans la barre d\'adresse et autorisez le microphone.';
                break;
            case 'NotFoundError':
            case 'DevicesNotFoundError':
                message = 'Aucun microphone trouvé.';
                solution = 'Vérifiez qu\'un microphone est connecté.';
                break;
            case 'NotReadableError':
            case 'TrackStartError':
                message = 'Microphone utilisé par une autre application.';
                solution = 'Fermez les autres applications utilisant le microphone.';
                break;
            case 'NotSupportedError':
                message = 'Microphone non supporté.';
                solution = 'Essayez avec un autre navigateur ou appareil.';
                break;
            default:
                if (location.protocol === 'http:' && location.hostname !== 'localhost') {
                    message = 'Microphone bloqué sur HTTP.';
                    solution = 'Utilisez HTTPS ou ngrok pour l\'accès externe.';
                }
                break;
        }

        this.addSystemMessage(message, 'error');
        if (solution) {
            this.addSystemMessage('💡 Solution: ' + solution, 'info');
        }
        
        this.recordBtn.disabled = true;
        this.addSecurityWarning();
    }

    addSecurityWarning() {
        if (location.protocol === 'http:' && location.hostname !== 'localhost') {
            const warningDiv = document.createElement('div');
            warningDiv.className = 'security-warning';
            warningDiv.innerHTML = `
                <div class="warning-content">
                    <h3>🔒 HTTPS Requis</h3>
                    <p>Pour utiliser le microphone sur un réseau externe, HTTPS est obligatoire.</p>
                    <div class="warning-solutions">
                        <h4>Solutions rapides:</h4>
                        <ol>
                            <li><strong>ngrok</strong>: <code>ngrok http 3000</code></li>
                            <li><strong>Serveur local</strong>: Connectez-vous au même WiFi</li>
                            <li><strong>Déployement HTTPS</strong>: Heroku, Netlify, etc.</li>
                        </ol>
                    </div>
                </div>
            `;
            
            this.messages.appendChild(warningDiv);
        }
    }

    initializeWebRTC() {
        if (!this.webrtcManager && window.WebRTCManager) {
            console.log('🌐 Initialisation WebRTC avec Xirsys...');
            this.webrtcManager = new WebRTCManager(this.socket);
            
            // Configurer le callback pour l'audio distant
            this.webrtcManager.onRemoteStream((stream) => {
                console.log('🎵 Stream audio distant reçu via WebRTC');
                this.playRemoteStream(stream);
            });
            
            // Demander la configuration ICE
            this.webrtcManager.requestIceConfig();
            
            this.addSystemMessage('WebRTC avec Xirsys initialisé');
        }
    }

    async initializeAndStartWebRTC() {
        this.initializeWebRTC();
        if (this.webrtcManager) {
            try {
                await this.webrtcManager.startWebRTCCall();
                this.addSystemMessage('🌐 WebRTC activé automatiquement');
            } catch (error) {
                console.error('❌ Échec WebRTC automatique:', error);
                this.addSystemMessage('WebRTC indisponible, utilisation Socket.IO', 'warning');
            }
        }
    }

    nextUser() {
        if (!this.isInConversation) return;
        
        console.log('🔄 Demande utilisateur suivant');
        this.addSystemMessage('Recherche d\'un nouveau partenaire...', 'info');
        
        // Nettoyer WebRTC
        if (this.webrtcManager) {
            this.webrtcManager.disconnect();
            this.webrtcManager = null;
        }
        
        // Envoyer la demande au serveur
        this.socket.emit('next-user');
        
        this.resetConversation();
    }

    resetConversation() {
        this.isInConversation = false;
        this.currentPartner = null;
        this.recordBtn.disabled = true;
        
        if (this.webrtcBtn) {
            this.webrtcBtn.innerHTML = '<span class="webrtc-icon">🔄</span><span>Recherche...</span>';
            this.webrtcBtn.disabled = true;
        }
    }

    updateMatchmakingUI() {
        if (!this.userState) return;
        
        const user = this.userState.user;
        const stats = this.userState.stats;
        const queuePos = this.userState.queuePosition;
        
        // Mise à jour du statut
        switch (user.status) {
            case 'available':
                this.readyStatus.textContent = 'Recherche d\'un partenaire...';
                break;
            case 'in_queue':
                this.readyStatus.textContent = `En file d'attente (position ${queuePos})`;
                break;
            case 'in_conversation':
                this.readyStatus.textContent = 'En conversation';
                if (this.webrtcBtn) {
                    this.webrtcBtn.innerHTML = '<span class="webrtc-icon">⏭️</span><span>Utilisateur suivant</span>';
                    this.webrtcBtn.disabled = false;
                    this.webrtcBtn.style.display = 'flex';
                }
                break;
        }
        
        // Mise à jour des statistiques
        this.updateStats(stats);
    }

    updateStats(stats) {
        if (this.usersCount) {
            this.usersCount.textContent = 
                `${stats.totalUsers} en ligne • ${stats.activeConversations} conversations • ${stats.usersInQueue} en attente`;
        }
    }

    async startWebRTCCall() {
        if (this.webrtcManager) {
            try {
                await this.webrtcManager.startWebRTCCall();
                this.useWebRTC = true;
                this.addSystemMessage('Appel WebRTC démarré');
            } catch (error) {
                console.error('❌ Échec démarrage WebRTC:', error);
                this.addSystemMessage('Échec WebRTC, utilisation Socket.IO', 'warning');
            }
        }
    }

    playRemoteStream(stream) {
        try {
            const audio = new Audio();
            audio.srcObject = stream;
            audio.volume = this.volumeSlider.value / 100;
            audio.play();
            
            console.log('🔊 Lecture stream distant via WebRTC');
        } catch (error) {
            console.error('❌ Erreur lecture stream distant:', error);
        }
    }

    async startRecording() {
        if (!this.isConnected || this.isRecording || !this.isInConversation) return;

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    sampleRate: 44100
                } 
            });

            this.mediaRecorder = new MediaRecorder(stream, {
                mimeType: 'audio/webm;codecs=opus'
            });

            this.audioChunks = [];
            this.isRecording = true;

            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.audioChunks.push(event.data);
                }
            };

            this.mediaRecorder.onstop = () => {
                const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm;codecs=opus' });
                this.sendAudioData(audioBlob);
                
                // Arrêter toutes les pistes audio
                stream.getTracks().forEach(track => track.stop());
            };

            this.mediaRecorder.start(100); // Envoyer des données toutes les 100ms
            
            // Mise à jour de l'interface
            this.recordBtn.style.background = 'linear-gradient(135deg, #ff6b6b, #ee5a52)';
            this.recordBtn.querySelector('.button-text').textContent = 'Enregistrement...';
            this.recordingIndicator.classList.add('active');
            
            // Signaler aux autres utilisateurs
            this.socket.emit('start-recording');
            
        } catch (error) {
            console.error('Erreur lors du démarrage de l\'enregistrement:', error);
            this.addSystemMessage('Erreur lors de l\'enregistrement', 'error');
        }
    }

    stopRecording() {
        if (!this.isRecording || !this.mediaRecorder) return;

        this.isRecording = false;
        this.mediaRecorder.stop();

        // Restaurer l'interface
        this.recordBtn.style.background = 'linear-gradient(135deg, #51cf66, #40c057)';
        this.recordBtn.querySelector('.button-text').textContent = 'Maintenir pour parler';
        this.recordingIndicator.classList.remove('active');
        
        // Signaler aux autres utilisateurs
        this.socket.emit('stop-recording');
    }

    async sendAudioData(audioBlob) {
        try {
            const arrayBuffer = await audioBlob.arrayBuffer();
            const base64Audio = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
            
            this.socket.emit('audio-data', {
                audio: base64Audio,
                type: audioBlob.type
            });
            
        } catch (error) {
            console.error('Erreur lors de l\'envoi de l\'audio:', error);
        }
    }

    async playReceivedAudio(audioData) {
        try {
            const binaryString = atob(audioData.audio);
            const bytes = new Uint8Array(binaryString.length);
            
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            
            const audioBlob = new Blob([bytes], { type: audioData.type });
            const audioUrl = URL.createObjectURL(audioBlob);
            
            const audio = new Audio(audioUrl);
            audio.volume = this.volumeSlider.value / 100;
            
            await audio.play();
            
            // Nettoyer l'URL après la lecture
            audio.addEventListener('ended', () => {
                URL.revokeObjectURL(audioUrl);
            });
            
        } catch (error) {
            console.error('Erreur lors de la lecture de l\'audio:', error);
        }
    }

    updateVolume(volume) {
        // Cette fonction peut être utilisée pour ajuster le volume des audios reçus
        document.querySelectorAll('audio').forEach(audio => {
            audio.volume = volume;
        });
    }

    addSystemMessage(message, type = 'info') {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message system-message ${type}`;
        messageDiv.innerHTML = `
            <div class="message-content">
                <span class="message-text">${message}</span>
                <span class="message-time">${new Date().toLocaleTimeString()}</span>
            </div>
        `;
        
        // Retirer le message de bienvenue s'il existe
        const welcomeMessage = this.messages.querySelector('.welcome-message');
        if (welcomeMessage) {
            welcomeMessage.style.display = 'none';
        }
        
        this.messages.appendChild(messageDiv);
        messageDiv.classList.add('fade-in');
        
        // Faire défiler vers le bas
        this.messages.scrollTop = this.messages.scrollHeight;
        
        // Retirer les anciens messages système (garder seulement les 5 derniers)
        const systemMessages = this.messages.querySelectorAll('.system-message');
        if (systemMessages.length > 5) {
            systemMessages[0].remove();
        }
    }
}

// Démarrer l'application quand la page est chargée
document.addEventListener('DOMContentLoaded', () => {
    new VoiceChatApp();
});