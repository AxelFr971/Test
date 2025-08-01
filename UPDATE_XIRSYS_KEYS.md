# 🔑 Mise à Jour des Clés Xirsys

## 🎯 Où Trouver Vos Clés Xirsys

### 1. **Connexion à Xirsys**
- Rendez-vous sur : https://xirsys.com/
- Connectez-vous à votre compte
- Accédez au **Dashboard**

### 2. **Récupération des Clés**
```
Dashboard → Your Applications → [Votre App] → Settings
```

Vous y trouverez :
- **Username** → `secretId` dans notre config
- **Secret** → `secretToken` dans notre config
- **TURN URL** → Construire l'URL complète

### 3. **Construction de l'URL**
```
Format: https://global.xirsys.net/_turn/[NomDeVotreApp]
Exemple: https://global.xirsys.net/_turn/monChatVocal
```

## 🔧 Méthodes de Configuration

### **Méthode 1: Fichier Direct**
```bash
# Éditer le fichier
nano config/secrets.js
```

Remplacer les valeurs :
```javascript
module.exports = {
  xirsys: {
    secretId: 'VOTRE_USERNAME_XIRSYS',
    secretToken: 'VOTRE_SECRET_XIRSYS',
    url: 'https://global.xirsys.net/_turn/VOTRE_APP_NAME',
    
    options: {
      format: 'urls',
      iceTransportPolicy: 'all'
    }
  }
};
```

### **Méthode 2: Variables d'Environnement**
```bash
# Créer un fichier .env
echo "XIRSYS_SECRET_ID=votre_username" >> .env
echo "XIRSYS_SECRET_TOKEN=votre_secret" >> .env
echo "XIRSYS_URL=https://global.xirsys.net/_turn/votre_app" >> .env
```

Puis modifier `config/secrets.js` :
```javascript
module.exports = {
  xirsys: {
    secretId: process.env.XIRSYS_SECRET_ID || 'aloche',
    secretToken: process.env.XIRSYS_SECRET_TOKEN || 'f324b37e-4650-11f0-af35-96dd14091898',
    url: process.env.XIRSYS_URL || 'https://global.xirsys.net/_turn/testApp',
    
    options: {
      format: 'urls',
      iceTransportPolicy: 'all'
    }
  }
};
```

### **Méthode 3: Script de Configuration**
```bash
# Utiliser le script de configuration
npm run configure-xirsys
```

## 🧪 Test des Clés

### **Vérification API**
```bash
# Tester les clés via API
curl -X GET "https://global.xirsys.net/_turn/VOTRE_APP" \
  -H "Authorization: Basic $(echo -n 'USERNAME:SECRET' | base64)" \
  -H "Content-Type: application/json"
```

### **Test dans l'Application**
```bash
# Démarrer l'application
npm start

# Tester l'endpoint de configuration
curl http://localhost:3000/api/ice-config
```

Réponse attendue :
```json
{
  "success": true,
  "config": {
    "iceServers": [
      {
        "urls": "stun:global.xirsys.net:3478",
        ...
      },
      {
        "urls": "turn:global.xirsys.net:80",
        "username": "...",
        "credential": "...",
        ...
      }
    ]
  },
  "provider": "xirsys"
}
```

## ⚠️ Sécurité

### **Fichiers à Protéger**
```bash
# Vérifier que ces fichiers sont gitignored
git status --ignored

# Doit montrer :
# config/secrets.js
# .env
```

### **Permissions Fichiers**
```bash
# Restricter l'accès au fichier de configuration
chmod 600 config/secrets.js
```

### **Variables d'Environnement Production**
Pour la production, utilisez les variables d'environnement :
```bash
export XIRSYS_SECRET_ID="votre_username"
export XIRSYS_SECRET_TOKEN="votre_secret"
export XIRSYS_URL="https://global.xirsys.net/_turn/votre_app"
```

## 🔍 Dépannage

### **Erreur "Xirsys non trouvé"**
```
⚠️ Configuration Xirsys non trouvée, utilisation des serveurs STUN publics
```
→ Vérifiez que `config/secrets.js` existe et est correctement formaté

### **Erreur "Unauthorized"**
```
❌ Erreur connexion Xirsys: Unauthorized
```
→ Vérifiez vos `secretId` et `secretToken`

### **Erreur "Invalid URL"**
```
❌ Erreur connexion Xirsys: Invalid URL
```
→ Vérifiez que l'URL correspond à votre application Xirsys

### **Test de Connectivité**
```bash
# Vérifier la connectivité Xirsys
node -e "
const XirsysService = require('./lib/xirsys');
const secrets = require('./config/secrets');
const xirsys = new XirsysService(secrets.xirsys);
xirsys.testConnection().then(result => 
  console.log('Test Xirsys:', result ? '✅ OK' : '❌ Échec')
);
"
```

## 📝 Notes Importantes

1. **Quota Xirsys** : Vérifiez votre quota mensuel
2. **Région** : Choisissez la région la plus proche de vos utilisateurs
3. **Backup** : Gardez une copie de vos clés en lieu sûr
4. **Rotation** : Changez régulièrement vos clés pour la sécurité

## 🚀 Optimisations

### **Configuration Avancée**
```javascript
xirsys: {
  // ... clés de base
  options: {
    format: 'urls',
    iceTransportPolicy: 'all',
    // Optimisations
    iceCandidatePoolSize: 10,
    bundlePolicy: 'max-bundle',
    rtcpMuxPolicy: 'require'
  }
}
```

### **Fallback Multiple**
```javascript
xirsys: {
  primary: {
    secretId: 'primary_id',
    secretToken: 'primary_token',
    url: 'https://global.xirsys.net/_turn/app1'
  },
  fallback: {
    secretId: 'fallback_id', 
    secretToken: 'fallback_token',
    url: 'https://global.xirsys.net/_turn/app2'
  }
}
```