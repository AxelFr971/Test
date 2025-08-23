# 🚛 Vocaline

**Plateforme web permettant aux chauffeurs routiers de se mettre en relation par la voix en 1-to-1 via leur navigateur.**

Vocaline est une application de communication vocale en temps réel conçue spécifiquement pour les chauffeurs routiers. Elle permet une mise en relation automatique entre utilisateurs connectés via WebRTC pour des conversations vocales de qualité.

## ✨ Fonctionnalités Principales

### 🎯 Matchmaking Audio
- **Connexions automatiques 1-on-1** : Mise en relation instantanée entre deux utilisateurs
- **WebRTC P2P** : Communication audio directe entre utilisateurs sans passer par le serveur
- **File d'attente intelligente** : Gestion automatique des utilisateurs en attente

### 🔄 Changement d'Utilisateur
- **Bouton "Utilisateur suivant"** : Permet de quitter la conversation actuelle et d'entrer immédiatement dans une nouvelle mise en relation
- **Transition fluide** : Changement instantané sans déconnexion

### 🚪 Déconnexion Simple
- **Fermeture d'onglet** : L'utilisateur peut quitter la plateforme en fermant l'onglet
- **Bouton "Quitter"** : Déconnexion propre avec notification au partenaire

### 📊 Logs en Temps Réel
- **Interface d'administration** : Accès via `/logs` avec filtres par type
- **Export CSV** : Exportation des données de logs
- **Copie et suppression** : Gestion complète des logs
- **Métriques** : Total logs, types d'événements, connexions, matchs réussis

### 💬 Feedback Utilisateurs
- **Formulaire simple** : Collecte d'avis avec notation (1-5 étoiles) et commentaires
- **Interface d'administration** : Accès via `/feedbacks` avec options de copie et export CSV
- **Statistiques** : Note moyenne, répartition des notes, activité récente

### 📈 Statistiques Temps Réel
- **Page d'accueil** : Affichage du nombre d'utilisateurs connectés, en attente, et de conversations actives
- **Mise à jour automatique** : Actualisation toutes les 30 secondes
- **Métriques clés** : Utilisateurs connectés, en file d'attente, conversations actives, total feedbacks

## 🛠️ Installation et Démarrage

### Prérequis
- Node.js (version 14 ou supérieure)
- npm ou yarn
- Navigateur moderne avec support WebRTC

### Installation
```bash
# Cloner le repository
git clone <repository-url>
cd vocaline

# Installer les dépendances
npm install

# Démarrer l'application
npm start
```

### Scripts Disponibles
```bash
# Démarrage en mode développement
npm run dev

# Démarrage local uniquement
npm run local

# Démarrage sur le réseau
npm run network

# Démarrage avec HTTPS
npm run https

# Configuration HTTPS
npm run setup-https
```

## 🌐 Accès à l'Application

- **Interface principale** : `http://localhost:3000`
- **Logs d'administration** : `http://localhost:3000/logs`
- **Feedbacks d'administration** : `http://localhost:3000/feedbacks`

## 🔧 Configuration

### Configuration Xirsys (Optionnel)
Pour une meilleure connectivité WebRTC, vous pouvez configurer Xirsys :

1. Créer un compte sur [Xirsys](https://xirsys.com)
2. Créer un fichier `config/secrets.js` :
```javascript
module.exports = {
  xirsys: {
    ident: 'votre-ident',
    secret: 'votre-secret',
    domain: 'votre-domaine',
    application: 'vocaline',
    room: 'default',
    secure: 1
  }
};
```

3. Tester la configuration :
```bash
npm run test-xirsys
```

### Configuration HTTPS
Pour un accès externe sécurisé :

```bash
# Générer les certificats
npm run generate-certs

# Démarrer avec HTTPS
npm run https
```

## 📱 Utilisation

### Pour les Utilisateurs
1. **Accéder à l'application** via le navigateur
2. **Entrer un pseudo** (minimum 2 caractères)
3. **Autoriser l'accès au microphone** quand demandé
4. **Attendre la mise en relation** automatique
5. **Maintenir le bouton** pour parler
6. **Utiliser "Utilisateur suivant"** pour changer de partenaire
7. **Soumettre un feedback** pour partager son avis

### Pour les Administrateurs
1. **Accéder aux logs** : `/logs`
   - Visualiser l'activité en temps réel
   - Filtrer par type d'événement
   - Exporter en CSV
   - Supprimer des logs

2. **Accéder aux feedbacks** : `/feedbacks`
   - Consulter les avis utilisateurs
   - Voir les statistiques de notation
   - Exporter les données
   - Gérer les feedbacks

## 🔒 Sécurité

- **HTTPS requis** pour l'accès externe au microphone
- **WebRTC P2P** : Les conversations audio ne passent pas par le serveur
- **Pas de stockage persistant** : Données en mémoire uniquement
- **Validation des entrées** : Protection contre les injections

## 📊 Métriques de Succès

L'application mesure automatiquement :
- **Nombre de connexions** utilisateurs
- **Nombre de matchs réussis**
- **Durée moyenne des conversations**
- **Nombre de feedbacks reçus**
- **Types d'événements** (connexions, déconnexions, matchs, etc.)

## 🚀 Déploiement

### Déploiement Local
```bash
npm start
```

### Déploiement avec PM2
```bash
npm install -g pm2
pm2 start server.js --name vocaline
pm2 startup
pm2 save
```

### Variables d'Environnement
- `PORT` : Port du serveur (défaut: 3000)
- `HOST` : Adresse d'écoute (défaut: 0.0.0.0)
- `HTTPS` : Activer HTTPS (true/false)

## 🐛 Dépannage

### Problèmes de Microphone
- Vérifier les permissions du navigateur
- Utiliser HTTPS pour l'accès externe
- Vérifier qu'aucune autre application n'utilise le microphone

### Problèmes de Connexion WebRTC
- Vérifier la configuration Xirsys
- Utiliser les serveurs STUN publics en fallback
- Vérifier les pare-feu et NAT

### Problèmes de Performance
- Limiter le nombre de logs en mémoire (configurable)
- Nettoyer régulièrement les anciens logs
- Surveiller l'utilisation mémoire

## 📝 Licence

MIT License - Voir le fichier LICENSE pour plus de détails.

## 🤝 Contribution

Les contributions sont les bienvenues ! N'hésitez pas à :
- Signaler des bugs
- Proposer des améliorations
- Soumettre des pull requests

## 📞 Support

Pour toute question ou problème :
- Ouvrir une issue sur GitHub
- Consulter la documentation technique
- Vérifier les logs d'administration

---

**Vocaline** - Communication vocale pour chauffeurs routiers 🚛