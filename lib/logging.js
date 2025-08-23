class LoggingSystem {
    constructor() {
        this.logs = [];
        this.maxLogs = 10000; // Limite pour éviter la surcharge mémoire
        this.logTypes = {
            'user_connected': 'Connexion utilisateur',
            'user_disconnected': 'Déconnexion utilisateur',
            'match_created': 'Match créé',
            'conversation_ended': 'Conversation terminée',
            'next_user_requested': 'Demande utilisateur suivant',
            'pseudo_updated': 'Pseudo mis à jour',
            'webrtc_connection': 'Connexion WebRTC',
            'webrtc_error': 'Erreur WebRTC',
            'feedback_submitted': 'Feedback soumis',
            'system_error': 'Erreur système'
        };
    }

    /**
     * Ajouter un log
     */
    addLog(type, data = {}) {
        const log = {
            id: this.generateId(),
            type: type,
            timestamp: new Date(),
            data: data,
            message: this.formatMessage(type, data)
        };

        this.logs.unshift(log); // Ajouter au début pour avoir les plus récents en premier

        // Limiter le nombre de logs en mémoire
        if (this.logs.length > this.maxLogs) {
            this.logs = this.logs.slice(0, this.maxLogs);
        }

        // Afficher dans la console pour le debug
        console.log(`📝 [${log.timestamp.toISOString()}] ${log.message}`);

        return log;
    }

    /**
     * Obtenir les logs avec filtres
     */
    getLogs(options = {}) {
        let filteredLogs = [...this.logs];

        // Filtrer par type
        if (options.type && options.type !== 'all') {
            filteredLogs = filteredLogs.filter(log => log.type === options.type);
        }

        // Appliquer la pagination
        const offset = options.offset || 0;
        const limit = options.limit || 100;
        const paginatedLogs = filteredLogs.slice(offset, offset + limit);

        return {
            logs: paginatedLogs,
            total: filteredLogs.length,
            types: this.getLogTypes(),
            stats: this.getLogStats()
        };
    }

    /**
     * Supprimer un log
     */
    deleteLog(logId) {
        const index = this.logs.findIndex(log => log.id === logId);
        if (index !== -1) {
            this.logs.splice(index, 1);
            return true;
        }
        return false;
    }

    /**
     * Exporter en CSV
     */
    exportToCSV(type = null) {
        let logsToExport = [...this.logs];
        
        if (type && type !== 'all') {
            logsToExport = logsToExport.filter(log => log.type === type);
        }

        const headers = ['ID', 'Type', 'Timestamp', 'Message', 'Data'];
        const csvRows = [headers.join(',')];

        logsToExport.forEach(log => {
            const row = [
                log.id,
                log.type,
                log.timestamp.toISOString(),
                `"${log.message.replace(/"/g, '""')}"`,
                `"${JSON.stringify(log.data).replace(/"/g, '""')}"`
            ];
            csvRows.push(row.join(','));
        });

        return csvRows.join('\n');
    }

    /**
     * Obtenir les statistiques des logs
     */
    getStats() {
        const stats = {
            total: this.logs.length,
            byType: {},
            recentActivity: {
                lastHour: 0,
                last24Hours: 0,
                last7Days: 0
            }
        };

        const now = new Date();
        const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        this.logs.forEach(log => {
            // Compter par type
            stats.byType[log.type] = (stats.byType[log.type] || 0) + 1;

            // Compter l'activité récente
            if (log.timestamp >= oneHourAgo) {
                stats.recentActivity.lastHour++;
            }
            if (log.timestamp >= oneDayAgo) {
                stats.recentActivity.last24Hours++;
            }
            if (log.timestamp >= sevenDaysAgo) {
                stats.recentActivity.last7Days++;
            }
        });

        return stats;
    }

    /**
     * Obtenir les types de logs disponibles
     */
    getLogTypes() {
        return this.logTypes;
    }

    /**
     * Générer un ID unique
     */
    generateId() {
        return `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Formater un message de log
     */
    formatMessage(type, data) {
        switch (type) {
            case 'user_connected':
                return `Utilisateur connecté: ${data.socketId || 'Inconnu'}`;
            
            case 'user_disconnected':
                return `Utilisateur déconnecté: ${data.socketId || 'Inconnu'}`;
            
            case 'match_created':
                return `Match créé entre ${data.user1 || 'Utilisateur 1'} et ${data.user2 || 'Utilisateur 2'}`;
            
            case 'conversation_ended':
                return `Conversation terminée: ${data.userId || 'Utilisateur'} (${data.reason || 'Raison inconnue'})`;
            
            case 'next_user_requested':
                return `Demande de changement d'utilisateur: ${data.socketId || 'Utilisateur'}`;
            
            case 'pseudo_updated':
                return `Pseudo mis à jour: ${data.socketId || 'Utilisateur'} → "${data.pseudo || 'Sans nom'}"`;
            
            case 'webrtc_connection':
                return `Connexion WebRTC établie: ${data.socketId || 'Utilisateur'}`;
            
            case 'webrtc_error':
                return `Erreur WebRTC: ${data.error || 'Erreur inconnue'} (${data.socketId || 'Utilisateur'})`;
            
            case 'feedback_submitted':
                return `Feedback soumis: ${data.pseudo || 'Anonyme'} (${data.rating || 0}/5)`;
            
            case 'system_error':
                return `Erreur système: ${data.error || 'Erreur inconnue'}`;
            
            default:
                return `Log de type "${type}": ${JSON.stringify(data)}`;
        }
    }

    /**
     * Nettoyer les anciens logs
     */
    cleanupOldLogs(daysToKeep = 7) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

        const initialCount = this.logs.length;
        this.logs = this.logs.filter(log => log.timestamp >= cutoffDate);
        const removedCount = initialCount - this.logs.length;

        if (removedCount > 0) {
            console.log(`🧹 Nettoyage des logs: ${removedCount} logs supprimés (plus de ${daysToKeep} jours)`);
        }

        return removedCount;
    }
}

module.exports = LoggingSystem;