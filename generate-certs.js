const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Créer le dossier certs s'il n'existe pas
const certsDir = path.join(__dirname, 'certs');
if (!fs.existsSync(certsDir)) {
    fs.mkdirSync(certsDir);
    console.log('📁 Dossier certs créé');
}

// Vérifier si OpenSSL est disponible
try {
    execSync('openssl version', { stdio: 'ignore' });
    console.log('✅ OpenSSL détecté');
} catch (error) {
    console.error('❌ OpenSSL non trouvé. Veuillez l\'installer:');
    console.log('   Windows: https://slproweb.com/products/Win32OpenSSL.html');
    console.log('   macOS: brew install openssl');
    console.log('   Linux: sudo apt-get install openssl');
    process.exit(1);
}

try {
    console.log('🔑 Génération des certificats SSL...');
    
    // Générer la clé privée
    execSync(`openssl genrsa -out ${path.join(certsDir, 'key.pem')} 2048`, { stdio: 'inherit' });
    console.log('✅ Clé privée générée');
    
    // Générer le certificat auto-signé
    const certCommand = `openssl req -new -x509 -key ${path.join(certsDir, 'key.pem')} -out ${path.join(certsDir, 'cert.pem')} -days 365 -subj "/C=FR/ST=France/L=Local/O=VoiceChat/OU=Dev/CN=localhost"`;
    execSync(certCommand, { stdio: 'inherit' });
    console.log('✅ Certificat auto-signé généré');
    
    console.log('\n🎉 Certificats SSL créés avec succès!');
    console.log('📍 Emplacement:', certsDir);
    console.log('🔒 Vous pouvez maintenant utiliser HTTPS avec: npm run https');
    console.log('\n⚠️  Note: Ces certificats sont auto-signés. Le navigateur affichera un avertissement de sécurité.');
    console.log('💡 Cliquez sur "Avancé" puis "Continuer vers localhost" pour accepter.');
    
} catch (error) {
    console.error('❌ Erreur lors de la génération des certificats:', error.message);
    process.exit(1);
}