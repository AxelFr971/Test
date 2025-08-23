class FeedbackSystem {
    constructor() {
        this.feedbacks = [];
        this.maxFeedbacks = 5000; // Limite pour éviter la surcharge mémoire
    }

    /**
     * Ajouter un feedback
     */
    addFeedback(data) {
        const feedback = {
            id: this.generateId(),
            rating: parseInt(data.rating) || 0,
            comment: data.comment || '',
            pseudo: data.pseudo || 'Anonyme',
            timestamp: new Date(),
            ip: data.ip || null
        };

        // Validation
        if (feedback.rating < 1 || feedback.rating > 5) {
            throw new Error('La note doit être entre 1 et 5');
        }

        if (feedback.comment.length > 1000) {
            throw new Error('Le commentaire ne peut pas dépasser 1000 caractères');
        }

        this.feedbacks.unshift(feedback); // Ajouter au début pour avoir les plus récents en premier

        // Limiter le nombre de feedbacks en mémoire
        if (this.feedbacks.length > this.maxFeedbacks) {
            this.feedbacks = this.feedbacks.slice(0, this.maxFeedbacks);
        }

        console.log(`💬 Feedback ajouté: ${feedback.pseudo} (${feedback.rating}/5)`);

        return feedback;
    }

    /**
     * Obtenir les feedbacks avec pagination
     */
    getFeedbacks(options = {}) {
        const offset = options.offset || 0;
        const limit = options.limit || 50;
        const paginatedFeedbacks = this.feedbacks.slice(offset, offset + limit);

        return {
            feedbacks: paginatedFeedbacks,
            total: this.feedbacks.length,
            stats: this.getStats()
        };
    }

    /**
     * Supprimer un feedback
     */
    deleteFeedback(feedbackId) {
        const index = this.feedbacks.findIndex(feedback => feedback.id === feedbackId);
        if (index !== -1) {
            this.feedbacks.splice(index, 1);
            return true;
        }
        return false;
    }

    /**
     * Exporter en CSV
     */
    exportToCSV() {
        const headers = ['ID', 'Pseudo', 'Note', 'Commentaire', 'Date'];
        const csvRows = [headers.join(',')];

        this.feedbacks.forEach(feedback => {
            const row = [
                feedback.id,
                `"${feedback.pseudo.replace(/"/g, '""')}"`,
                feedback.rating,
                `"${feedback.comment.replace(/"/g, '""')}"`,
                feedback.timestamp.toISOString()
            ];
            csvRows.push(row.join(','));
        });

        return csvRows.join('\n');
    }

    /**
     * Obtenir les statistiques des feedbacks
     */
    getStats() {
        const stats = {
            total: this.feedbacks.length,
            averageRating: 0,
            ratingDistribution: {
                1: 0, 2: 0, 3: 0, 4: 0, 5: 0
            },
            recentActivity: {
                lastHour: 0,
                last24Hours: 0,
                last7Days: 0
            }
        };

        if (this.feedbacks.length === 0) {
            return stats;
        }

        const now = new Date();
        const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        let totalRating = 0;

        this.feedbacks.forEach(feedback => {
            // Compter les notes
            totalRating += feedback.rating;
            stats.ratingDistribution[feedback.rating]++;

            // Compter l'activité récente
            if (feedback.timestamp >= oneHourAgo) {
                stats.recentActivity.lastHour++;
            }
            if (feedback.timestamp >= oneDayAgo) {
                stats.recentActivity.last24Hours++;
            }
            if (feedback.timestamp >= sevenDaysAgo) {
                stats.recentActivity.last7Days++;
            }
        });

        stats.averageRating = (totalRating / this.feedbacks.length).toFixed(2);

        return stats;
    }

    /**
     * Obtenir les feedbacks les plus récents
     */
    getRecentFeedbacks(limit = 10) {
        return this.feedbacks.slice(0, limit);
    }

    /**
     * Obtenir les feedbacks par note
     */
    getFeedbacksByRating(rating) {
        return this.feedbacks.filter(feedback => feedback.rating === rating);
    }

    /**
     * Rechercher dans les feedbacks
     */
    searchFeedbacks(query) {
        const searchTerm = query.toLowerCase();
        return this.feedbacks.filter(feedback => 
            feedback.pseudo.toLowerCase().includes(searchTerm) ||
            feedback.comment.toLowerCase().includes(searchTerm)
        );
    }

    /**
     * Générer un ID unique
     */
    generateId() {
        return `feedback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Nettoyer les anciens feedbacks
     */
    cleanupOldFeedbacks(daysToKeep = 30) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

        const initialCount = this.feedbacks.length;
        this.feedbacks = this.feedbacks.filter(feedback => feedback.timestamp >= cutoffDate);
        const removedCount = initialCount - this.feedbacks.length;

        if (removedCount > 0) {
            console.log(`🧹 Nettoyage des feedbacks: ${removedCount} feedbacks supprimés (plus de ${daysToKeep} jours)`);
        }

        return removedCount;
    }

    /**
     * Obtenir un résumé des feedbacks
     */
    getSummary() {
        const stats = this.getStats();
        
        return {
            totalFeedbacks: stats.total,
            averageRating: stats.averageRating,
            topRating: Math.max(...Object.values(stats.ratingDistribution)),
            recentActivity: stats.recentActivity.last24Hours,
            ratingBreakdown: stats.ratingDistribution
        };
    }
}

module.exports = FeedbackSystem;