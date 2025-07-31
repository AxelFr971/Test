class WebRTCManager {
    constructor(socket) {
        this.socket = socket;
        this.peerConnection = null;
        this.localStream = null;
        this.remoteStream = null;
        this.iceConfig = null;
        this.isInitiator = false;
        this.onRemoteStreamCallback = null;
        
        this.setupSocketListeners();
    }

    setupSocketListeners() {
        // Recevoir la configuration ICE
        this.socket.on('ice-config', (data) => {
            if (data.success) {
                this.iceConfig = data.config;
                console.log(`🌐 Configuration ICE reçue (${data.provider}):`, data.config);
                this.addSystemMessage(`Connectivité ${data.provider === 'xirsys' ? 'Xirsys' : 'publique'} configurée`);
            } else {
                console.error('❌ Erreur configuration ICE:', data.error);
                this.addSystemMessage('Erreur de configuration réseau', 'error');
            }
        });

        // Gérer les offres WebRTC
        this.socket.on('webrtc-offer', async (data) => {
            console.log('📞 Offre WebRTC reçue de:', data.senderId);
            if (!this.peerConnection) {
                await this.createPeerConnection();
            }
            
            try {
                await this.peerConnection.setRemoteDescription(data.offer);
                const answer = await this.peerConnection.createAnswer();
                await this.peerConnection.setLocalDescription(answer);
                
                this.socket.emit('webrtc-answer', { answer: answer });
                this.addSystemMessage('Connexion WebRTC établie');
            } catch (error) {
                console.error('❌ Erreur traitement offre:', error);
                this.addSystemMessage('Erreur de connexion WebRTC', 'error');
            }
        });

        // Gérer les réponses WebRTC
        this.socket.on('webrtc-answer', async (data) => {
            console.log('✅ Réponse WebRTC reçue de:', data.senderId);
            try {
                await this.peerConnection.setRemoteDescription(data.answer);
                this.addSystemMessage('Connexion WebRTC confirmée');
            } catch (error) {
                console.error('❌ Erreur traitement réponse:', error);
            }
        });

        // Gérer les candidats ICE
        this.socket.on('webrtc-ice-candidate', async (data) => {
            console.log('🧊 Candidat ICE reçu');
            try {
                if (this.peerConnection && data.candidate) {
                    await this.peerConnection.addIceCandidate(data.candidate);
                }
            } catch (error) {
                console.error('❌ Erreur ajout candidat ICE:', error);
            }
        });
    }

    async requestIceConfig() {
        console.log('🔄 Demande de configuration ICE...');
        this.socket.emit('request-ice-config');
    }

    async createPeerConnection() {
        if (!this.iceConfig) {
            console.log('⏳ Configuration ICE non disponible, demande en cours...');
            await this.requestIceConfig();
            
            // Attendre la configuration ICE
            await new Promise((resolve) => {
                const checkConfig = () => {
                    if (this.iceConfig) {
                        resolve();
                    } else {
                        setTimeout(checkConfig, 100);
                    }
                };
                checkConfig();
            });
        }

        console.log('🔧 Création PeerConnection avec config:', this.iceConfig);
        
        this.peerConnection = new RTCPeerConnection(this.iceConfig);

        // Gestion des candidats ICE
        this.peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                console.log('🧊 Envoi candidat ICE');
                this.socket.emit('webrtc-ice-candidate', { candidate: event.candidate });
            }
        };

        // Gestion du stream distant
        this.peerConnection.ontrack = (event) => {
            console.log('🎵 Stream distant reçu');
            this.remoteStream = event.streams[0];
            if (this.onRemoteStreamCallback) {
                this.onRemoteStreamCallback(this.remoteStream);
            }
            this.addSystemMessage('Audio distant connecté');
        };

        // Gestion des états de connexion
        this.peerConnection.onconnectionstatechange = () => {
            console.log('🔗 État connexion WebRTC:', this.peerConnection.connectionState);
            
            switch (this.peerConnection.connectionState) {
                case 'connected':
                    this.addSystemMessage('WebRTC connecté - Qualité optimale');
                    break;
                case 'disconnected':
                    this.addSystemMessage('WebRTC déconnecté');
                    break;
                case 'failed':
                    this.addSystemMessage('Échec connexion WebRTC, retour au mode Socket.IO', 'warning');
                    break;
            }
        };

        this.peerConnection.oniceconnectionstatechange = () => {
            console.log('🧊 État ICE:', this.peerConnection.iceConnectionState);
        };

        return this.peerConnection;
    }

    async startWebRTCCall() {
        try {
            // Obtenir le stream local
            this.localStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    sampleRate: 44100
                }
            });

            // Créer la connexion
            await this.createPeerConnection();

            // Ajouter le stream local
            this.localStream.getTracks().forEach(track => {
                this.peerConnection.addTrack(track, this.localStream);
            });

            // Créer et envoyer l'offre
            this.isInitiator = true;
            const offer = await this.peerConnection.createOffer();
            await this.peerConnection.setLocalDescription(offer);
            
            this.socket.emit('webrtc-offer', { offer: offer });
            console.log('📞 Offre WebRTC envoyée');
            this.addSystemMessage('Initiation connexion WebRTC...');

        } catch (error) {
            console.error('❌ Erreur démarrage WebRTC:', error);
            this.addSystemMessage('Erreur démarrage WebRTC: ' + error.message, 'error');
            throw error;
        }
    }

    onRemoteStream(callback) {
        this.onRemoteStreamCallback = callback;
    }

    async sendAudioViaWebRTC(audioBlob) {
        // Si WebRTC est connecté, on pourrait envoyer via dataChannel
        // Pour l'instant, on garde le système actuel via Socket.IO
        return null;
    }

    isWebRTCConnected() {
        return this.peerConnection && 
               this.peerConnection.connectionState === 'connected';
    }

    disconnect() {
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
        }
        
        if (this.peerConnection) {
            this.peerConnection.close();
        }
        
        this.peerConnection = null;
        this.localStream = null;
        this.remoteStream = null;
    }

    addSystemMessage(message, type = 'info') {
        // Interface avec l'application principale
        if (window.voiceChatApp) {
            window.voiceChatApp.addSystemMessage(`🌐 WebRTC: ${message}`, type);
        }
    }
}

window.WebRTCManager = WebRTCManager;