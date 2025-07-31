# 💬 Chat Vocal Simple

Une application web simple et épurée permettant à deux utilisateurs de communiquer par la voix en temps réel.

## 🚀 Fonctionnalités

- **Communication vocale en temps réel** entre deux utilisateurs
- **Interface moderne et épurée** avec design responsive
- **Enregistrement par maintien** du bouton (push-to-talk)
- **Contrôle du volume** pour la réception audio
- **Indicateurs visuels** de statut de connexion et d'enregistrement
- **Support mobile** avec gestes tactiles
- **Messages système** pour guider l'utilisateur

## 🛠️ Technologies utilisées

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Backend**: Node.js, Express.js
- **Communication temps réel**: Socket.IO
- **Audio**: Web Audio API, MediaRecorder API

## 📦 Installation

1. **Cloner le projet** (ou utiliser les fichiers existants)

2. **Installer les dépendances**
   ```bash
   npm install
   ```

3. **Démarrer le serveur**
   ```bash
   npm start
   ```
   
   Ou pour le développement avec auto-reload :
   ```bash
   npm run dev
   ```

4. **Ouvrir l'application**
   - **Local** : `http://localhost:3000`
   - **Réseau WiFi** : Le serveur affichera automatiquement les IP disponibles
   - **Accès externe** : Voir le guide [Configuration Réseau](network-setup.md)
   - Ouvrez l'URL dans **deux onglets ou appareils différents** pour tester

## 🎯 Utilisation

1. **Autoriser l'accès au microphone** lorsque demandé par le navigateur
2. **Attendre qu'un deuxième utilisateur se connecte**
3. **Maintenir le bouton "Maintenir pour parler"** pour enregistrer votre voix
4. **Relâcher le bouton** pour envoyer l'audio à votre correspondant
5. **Ajuster le volume** avec le curseur si nécessaire

## 🔧 Configuration

### Scripts disponibles
```bash
npm start        # Accès réseau (0.0.0.0:3000)
npm run local    # Accès local uniquement (localhost:3000)
npm run network  # Accès réseau explicite (0.0.0.0:3000)
npm run public   # Accès public (0.0.0.0:8080)
npm run dev      # Développement avec auto-reload
```

### Accès réseau externe
Pour accéder depuis la 5G/4G ou d'autres réseaux, consultez le guide détaillé : [Configuration Réseau](network-setup.md)

### Port du serveur
Le serveur écoute par défaut sur le port `3000`. Vous pouvez le modifier :

```bash
PORT=8080 npm start
```

### Qualité audio
Les paramètres audio peuvent être ajustés dans `public/app.js` :

```javascript
audio: {
    echoCancellation: true,    // Suppression d'écho
    noiseSuppression: true,    // Suppression du bruit
    sampleRate: 44100         // Fréquence d'échantillonnage
}
```

## 🌐 Compatibilité

- **Navigateurs modernes** supportant WebRTC et MediaRecorder API
- **Chrome/Chromium** : Support complet
- **Firefox** : Support complet
- **Safari** : Support partiel (iOS 14.3+)
- **Edge** : Support complet

## 🔒 Sécurité

- L'application nécessite **HTTPS en production** pour accéder au microphone
- Aucune donnée audio n'est stockée sur le serveur
- Communication directe entre clients via WebSocket

## 📱 Support mobile

L'application est entièrement responsive et fonctionne sur mobile avec :
- Gestes tactiles pour l'enregistrement
- Interface adaptée aux petits écrans
- Support des navigateurs mobiles modernes

## 🐛 Dépannage

### Erreur d'accès au microphone
- Vérifiez que vous avez autorisé l'accès au microphone
- En production, utilisez HTTPS
- Rechargez la page et réessayez

### Pas de son reçu
- Vérifiez que les deux utilisateurs sont connectés
- Testez le volume avec le curseur
- Vérifiez la console pour les erreurs

### Problèmes de connexion
- Vérifiez que le serveur est démarré
- Regardez les logs du serveur pour les erreurs
- Testez dans un autre navigateur

## 🔄 Structure du projet

```
voice-chat-app/
├── package.json          # Configuration npm
├── server.js             # Serveur Node.js/Socket.IO
├── README.md             # Documentation
└── public/               # Fichiers client
    ├── index.html        # Page principale
    ├── style.css         # Styles CSS
    └── app.js            # Application JavaScript
```

## 🎨 Personnalisation

### Couleurs
Les couleurs peuvent être modifiées dans `public/style.css` en changeant les variables CSS dans les gradients et couleurs principales.

### Messages
Les messages système peuvent être personnalisés dans la méthode `addSystemMessage()` de `public/app.js`.

## 📄 Licence

MIT License - Libre d'utilisation et de modification.

---

**Note importante** : Cette application est conçue pour un usage local ou intranet. Pour un déploiement en production, considérez l'ajout de fonctionnalités de sécurité supplémentaires et l'optimisation pour la scalabilité.