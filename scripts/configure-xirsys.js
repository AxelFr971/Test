const readline = require('readline');
const fs = require('fs');
const path = require('path');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('🔑 Configuration Interactive des Clés Xirsys\n');

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

async function configureXirsys() {
  try {
    console.log('📋 Veuillez fournir vos informations Xirsys:');
    console.log('   (Disponibles sur: https://xirsys.com/dashboard)\n');

    const secretId = await askQuestion('🔹 Username Xirsys (secretId): ');
    const secretToken = await askQuestion('🔹 Secret Xirsys (secretToken): ');
    const appName = await askQuestion('🔹 Nom de votre application Xirsys: ');

    if (!secretId || !secretToken || !appName) {
      console.log('❌ Toutes les informations sont requises.');
      process.exit(1);
    }

    const url = `https://global.xirsys.net/_turn/${appName}`;

    const config = `// Configuration privée - NE PAS COMMITER
// Ce fichier contient des informations sensibles

module.exports = {
  xirsys: {
    secretId: '${secretId}',
    secretToken: '${secretToken}',
    url: '${url}',
    
    // Configuration optionnelle
    options: {
      format: 'urls',
      iceTransportPolicy: 'all'
    }
  },
  
  // Autres configurations sensibles peuvent être ajoutées ici
  server: {
    // Clés SSL personnalisées si nécessaire
    // sslKey: '',
    // sslCert: ''
  }
};`;

    // Créer le dossier config s'il n'existe pas
    const configDir = path.join(__dirname, '..', 'config');
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }

    // Écrire le fichier de configuration
    const configPath = path.join(configDir, 'secrets.js');
    fs.writeFileSync(configPath, config);

    console.log('\n✅ Configuration Xirsys sauvegardée !');
    console.log(`📁 Fichier: ${configPath}`);
    console.log('\n🧪 Test de la configuration...');

    // Tester la configuration
    try {
      const XirsysService = require('../lib/xirsys');
      const secrets = require('../config/secrets');
      const xirsysService = new XirsysService(secrets.xirsys);
      
      const testResult = await xirsysService.testConnection();
      
      if (testResult) {
        console.log('✅ Test Xirsys: Connexion réussie !');
        console.log('🎉 Votre configuration Xirsys est opérationnelle.');
      } else {
        console.log('❌ Test Xirsys: Échec de connexion');
        console.log('⚠️  Vérifiez vos clés et réessayez.');
      }
    } catch (error) {
      console.log('❌ Erreur lors du test:', error.message);
      console.log('💡 L\'application utilisera les serveurs STUN publics en fallback.');
    }

    console.log('\n🚀 Vous pouvez maintenant démarrer l\'application:');
    console.log('   npm start');

  } catch (error) {
    console.error('❌ Erreur lors de la configuration:', error.message);
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Vérifier si le fichier existe déjà
const configPath = path.join(__dirname, '..', 'config', 'secrets.js');
if (fs.existsSync(configPath)) {
  console.log('⚠️  Le fichier config/secrets.js existe déjà.');
  rl.question('Voulez-vous le remplacer ? (y/N): ', (answer) => {
    if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
      configureXirsys();
    } else {
      console.log('Configuration annulée.');
      rl.close();
    }
  });
} else {
  configureXirsys();
}