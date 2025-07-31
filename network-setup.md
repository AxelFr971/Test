# 🌐 Configuration d'Accès Réseau

Ce guide vous explique comment configurer l'application pour y accéder depuis différents réseaux.

## 🏠 Accès Local (même machine)

```bash
npm run local
```
- Accès uniquement depuis `http://localhost:3000`
- Idéal pour les tests locaux

## 📡 Accès Réseau Local (WiFi)

```bash
npm run network
# ou simplement
npm start
```

Le serveur affichera automatiquement toutes les adresses IP disponibles :
```
📡 Accès réseau disponibles:
   WiFi: http://192.168.1.100:3000
   Ethernet: http://192.168.0.50:3000
```

### Pour accéder depuis un autre appareil :
1. **Connectez l'appareil au même réseau WiFi**
2. **Utilisez l'adresse IP affichée** (ex: `http://192.168.1.100:3000`)
3. **Autorisez l'accès microphone** sur chaque appareil

## 🌍 Accès Externe (Internet - 5G/4G)

### Option 1: Tunnel avec ngrok (Recommandé pour les tests)

1. **Installer ngrok** :
   ```bash
   # MacOS avec Homebrew
   brew install ngrok
   
   # Windows avec Chocolatey
   choco install ngrok
   
   # Ou télécharger depuis https://ngrok.com/
   ```

2. **Démarrer l'application** :
   ```bash
   npm start
   ```

3. **Dans un nouveau terminal, créer le tunnel** :
   ```bash
   ngrok http 3000
   ```

4. **Utiliser l'URL fournie** (ex: `https://abc123.ngrok.io`)

### Option 2: Configuration Routeur (Port Forwarding)

1. **Accéder à l'interface de votre routeur** (généralement `192.168.1.1`)

2. **Configurer le port forwarding** :
   - Port externe : `3000` (ou autre)
   - Port interne : `3000`
   - IP de destination : votre IP locale (ex: `192.168.1.100`)

3. **Trouver votre IP publique** :
   ```bash
   curl ifconfig.me
   ```

4. **Accéder via** : `http://[votre-ip-publique]:3000`

### Option 3: Services Cloud

#### Heroku (Gratuit)
```bash
# Installer Heroku CLI
npm install -g heroku

# Se connecter
heroku login

# Créer l'app
heroku create votre-chat-vocal

# Déployer
git add .
git commit -m "Deploy voice chat"
git push heroku main
```

#### Railway
```bash
# Installer Railway CLI
npm install -g @railway/cli

# Se connecter
railway login

# Déployer
railway deploy
```

## 🔒 Considérations de Sécurité

### HTTPS Requis pour la Production
Pour l'accès microphone en production, HTTPS est obligatoire :

1. **Avec ngrok** : HTTPS automatique
2. **Avec un domaine** : Utiliser Let's Encrypt
3. **Cloud services** : HTTPS inclus

### Configuration HTTPS Locale (développement)

Créer un certificat auto-signé :

```bash
# Générer les certificats
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes
```

Modifier `server.js` pour HTTPS :

```javascript
const https = require('https');
const fs = require('fs');

const options = {
  key: fs.readFileSync('key.pem'),
  cert: fs.readFileSync('cert.pem')
};

const server = https.createServer(options, app);
```

## 🛠️ Dépannage

### Firewall / Antivirus
- **Windows** : Autoriser Node.js dans le pare-feu
- **macOS** : Autoriser les connexions entrantes
- **Linux** : Configurer iptables si nécessaire

### Problèmes de Réseau
```bash
# Vérifier les ports ouverts
netstat -an | grep 3000

# Tester la connectivité
ping [adresse-ip]
telnet [adresse-ip] 3000
```

### Accès Microphone
- **HTTP Local** : ✅ Autorisé
- **HTTPS** : ✅ Autorisé
- **HTTP Externe** : ❌ Bloqué par les navigateurs
- **Solution** : Utiliser HTTPS (ngrok, certificat SSL, etc.)

## 📱 Test Multi-Appareils

1. **Smartphone + Ordinateur** :
   - Connecter au même WiFi
   - Ouvrir l'URL sur les deux appareils

2. **Différents Réseaux** :
   - Utiliser ngrok ou port forwarding
   - Tester avec 4G/5G sur mobile

3. **Navigateurs Différents** :
   - Chrome, Firefox, Safari, Edge
   - Tester la compatibilité audio

## 🚀 Scripts Rapides

```bash
# Accès local uniquement
npm run local

# Accès réseau WiFi
npm run network

# Accès public (port 8080)
npm run public

# Développement avec auto-reload
npm run dev
```

---

**💡 Conseil** : Pour un usage régulier, utilisez ngrok ou déployez sur un service cloud pour un accès facile depuis n'importe où.