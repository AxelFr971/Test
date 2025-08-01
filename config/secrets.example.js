// Exemple de configuration - Copiez ce fichier vers secrets.js et remplissez vos vraies clés

module.exports = {
  xirsys: {
    secretId: 'votre_xirsys_secret_id',
    secretToken: 'votre_xirsys_secret_token',
    url: 'https://global.xirsys.net/_turn/votre_app',
    
    // Configuration optionnelle
    options: {
      format: 'urls',
      iceTransportPolicy: 'all'
    }
  },
  
  // Autres configurations sensibles
  server: {
    // Clés SSL personnalisées si nécessaire
    // sslKey: '',
    // sslCert: ''
  }
};