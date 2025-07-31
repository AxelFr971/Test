class VoiceChatApp {
    constructor() {
        this.socket = io();
        this.mediaRecorder = null;
        this.audioContext = null;
        this.audioChunks = [];
        this.isRecording = false;
        this.isConnected = false;
        
        this.initializeElements();
        this.setupEventListeners();
        this.setupSocketListeners();
        this.initializeAudio();
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

        this.socket.on('users-count', (count) => {
            this.usersCount.textContent = `${count} utilisateur(s) connecté(s)`;
            
            if (count >= 2) {
                this.readyStatus.textContent = 'Prêt à discuter !';
                this.addSystemMessage('Vous pouvez maintenant discuter avec votre correspondant');
            } else {
                this.readyStatus.textContent = 'En attente d\'un autre utilisateur...';
            }
        });

        this.socket.on('audio-data', (audioData) => {
            this.playReceivedAudio(audioData);
        });

        this.socket.on('user-speaking', (userId) => {
            this.addSystemMessage('Votre correspondant parle...');
        });

        this.socket.on('user-stopped-speaking', (userId) => {
            // Message optionnel quand l'autre utilisateur arrête de parler
        });
    }

    async initializeAudio() {
        try {
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
            
        } catch (error) {
            console.error('Erreur d\'accès au microphone:', error);
            this.addSystemMessage('Erreur d\'accès au microphone. Veuillez autoriser l\'accès.', 'error');
            this.recordBtn.disabled = true;
        }
    }

    async startRecording() {
        if (!this.isConnected || this.isRecording) return;

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