const https = require('https');

class XirsysService {
  constructor(config) {
    this.secretId = config.secretId;
    this.secretToken = config.secretToken;
    this.url = config.url;
    this.options = config.options || {};
  }

  /**
   * Obtenir les serveurs ICE (STUN/TURN) depuis Xirsys
   * @param {string} userId - Identifiant unique de l'utilisateur
   * @returns {Promise<Object>} Configuration ICE
   */
  async getIceServers(userId = 'anonymous') {
    return new Promise((resolve, reject) => {
      const auth = Buffer.from(`${this.secretId}:${this.secretToken}`).toString('base64');
      
      const options = {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json'
        }
      };

      console.log('🌐 Récupération des serveurs ICE depuis Xirsys...');
      
      const req = https.request(this.url, options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            
            if (response.s === 'ok' && response.v && response.v.iceServers) {
              console.log('✅ Serveurs ICE récupérés avec succès');
              console.log(`📊 ${response.v.iceServers.length} serveurs disponibles`);
              
              resolve({
                iceServers: response.v.iceServers,
                iceTransportPolicy: this.options.iceTransportPolicy || 'all'
              });
            } else {
              console.error('❌ Réponse Xirsys invalide:', response);
              reject(new Error('Réponse Xirsys invalide: ' + JSON.stringify(response)));
            }
          } catch (error) {
            console.error('❌ Erreur parsing JSON Xirsys:', error);
            reject(new Error('Erreur parsing réponse Xirsys: ' + error.message));
          }
        });
      });
      
      req.on('error', (error) => {
        console.error('❌ Erreur connexion Xirsys:', error);
        reject(new Error('Erreur connexion Xirsys: ' + error.message));
      });
      
      req.setTimeout(10000, () => {
        req.destroy();
        reject(new Error('Timeout connexion Xirsys'));
      });
      
      req.end();
    });
  }

  /**
   * Obtenir une configuration ICE avec fallback
   * @param {string} userId - Identifiant utilisateur
   * @returns {Promise<Object>} Configuration ICE avec fallback
   */
  async getIceConfigWithFallback(userId = 'anonymous') {
    try {
      return await this.getIceServers(userId);
    } catch (error) {
      console.warn('⚠️ Échec Xirsys, utilisation des serveurs STUN publics');
      
      // Configuration de fallback avec serveurs STUN publics
      return {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' },
          { urls: 'stun:stun3.l.google.com:19302' },
          { urls: 'stun:stun4.l.google.com:19302' }
        ],
        iceTransportPolicy: 'all'
      };
    }
  }

  /**
   * Tester la connectivité Xirsys
   * @returns {Promise<boolean>} Statut de la connectivité
   */
  async testConnection() {
    try {
      const config = await this.getIceServers('test');
      return config && config.iceServers && config.iceServers.length > 0;
    } catch (error) {
      console.error('❌ Test connexion Xirsys échoué:', error.message);
      return false;
    }
  }
}

module.exports = XirsysService;