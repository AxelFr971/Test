class MatchmakingSystem {
    constructor() {
        this.users = new Map(); // userId -> userObject
        this.conversations = new Map(); // conversationId -> { user1, user2, startTime }
        this.queue = []; // Liste des utilisateurs en attente
        this.userConversations = new Map(); // userId -> conversationId
    }

    /**
     * Ajouter un utilisateur au système
     */
    addUser(userId, socketId, userInfo = {}) {
        const user = {
            id: userId,
            socketId: socketId,
            status: 'available', // available, in_conversation, in_queue
            joinedAt: new Date(),
            conversationId: null,
            ...userInfo
        };

        this.users.set(userId, user);
        console.log(`👤 Utilisateur ajouté: ${userId} (${socketId})`);
        
        // Essayer de faire un match immédiatement
        this.tryMatch(userId);
        
        return user;
    }

    /**
     * Retirer un utilisateur du système
     */
    removeUser(userId) {
        const user = this.users.get(userId);
        if (!user) return null;

        // Si l'utilisateur est en conversation, libérer son partenaire
        if (user.conversationId) {
            this.endConversation(user.conversationId, 'user_left');
        }

        // Retirer de la queue si présent
        this.removeFromQueue(userId);

        // Supprimer l'utilisateur
        this.users.delete(userId);
        this.userConversations.delete(userId);

        console.log(`👤 Utilisateur retiré: ${userId}`);
        return user;
    }

    /**
     * Essayer de matcher un utilisateur
     */
    tryMatch(userId) {
        const user = this.users.get(userId);
        if (!user || user.status !== 'available') return null;

        // Chercher un autre utilisateur disponible
        const availableUsers = Array.from(this.users.values())
            .filter(u => u.id !== userId && u.status === 'available');

        if (availableUsers.length > 0) {
            // Créer une conversation avec le premier utilisateur disponible
            const partner = availableUsers[0];
            return this.createConversation(user, partner);
        } else {
            // Mettre l'utilisateur en queue
            this.addToQueue(userId);
            return null;
        }
    }

    /**
     * Créer une conversation entre deux utilisateurs
     */
    createConversation(user1, user2) {
        const conversationId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const conversation = {
            id: conversationId,
            user1: user1.id,
            user2: user2.id,
            startTime: new Date(),
            status: 'active'
        };

        // Mettre à jour les statuts des utilisateurs
        user1.status = 'in_conversation';
        user1.conversationId = conversationId;
        user2.status = 'in_conversation';
        user2.conversationId = conversationId;

        // Retirer de la queue si présents
        this.removeFromQueue(user1.id);
        this.removeFromQueue(user2.id);

        // Sauvegarder la conversation
        this.conversations.set(conversationId, conversation);
        this.userConversations.set(user1.id, conversationId);
        this.userConversations.set(user2.id, conversationId);

        console.log(`💬 Conversation créée: ${conversationId} (${user1.id} ↔ ${user2.id})`);
        
        return conversation;
    }

    /**
     * Terminer une conversation
     */
    endConversation(conversationId, reason = 'ended') {
        const conversation = this.conversations.get(conversationId);
        if (!conversation) return null;

        const user1 = this.users.get(conversation.user1);
        const user2 = this.users.get(conversation.user2);

        // Libérer les utilisateurs
        if (user1) {
            user1.status = 'available';
            user1.conversationId = null;
            this.userConversations.delete(user1.id);
        }

        if (user2) {
            user2.status = 'available';
            user2.conversationId = null;
            this.userConversations.delete(user2.id);
        }

        // Supprimer la conversation
        this.conversations.delete(conversationId);

        console.log(`💬 Conversation terminée: ${conversationId} (${reason})`);

        // Essayer de rematcher les utilisateurs libérés avec la queue
        if (user1) this.tryMatchFromQueue(user1.id);
        if (user2) this.tryMatchFromQueue(user2.id);

        return conversation;
    }

    /**
     * Passer à l'utilisateur suivant
     */
    nextUser(userId) {
        const user = this.users.get(userId);
        if (!user || user.status !== 'in_conversation') return null;

        const conversationId = user.conversationId;
        const conversation = this.conversations.get(conversationId);
        if (!conversation) return null;

        // Terminer la conversation actuelle
        this.endConversation(conversationId, 'next_user');

        // Essayer de matcher immédiatement
        return this.tryMatch(userId);
    }

    /**
     * Ajouter à la queue
     */
    addToQueue(userId) {
        const user = this.users.get(userId);
        if (!user || this.queue.includes(userId)) return;

        user.status = 'in_queue';
        this.queue.push(userId);
        
        console.log(`⏳ Utilisateur en queue: ${userId} (position ${this.queue.length})`);
    }

    /**
     * Retirer de la queue
     */
    removeFromQueue(userId) {
        const index = this.queue.indexOf(userId);
        if (index > -1) {
            this.queue.splice(index, 1);
            console.log(`⏳ Utilisateur retiré de la queue: ${userId}`);
        }
    }

    /**
     * Essayer de matcher depuis la queue
     */
    tryMatchFromQueue(availableUserId) {
        if (this.queue.length === 0) return null;

        const availableUser = this.users.get(availableUserId);
        if (!availableUser || availableUser.status !== 'available') return null;

        // Prendre le premier de la queue
        const queuedUserId = this.queue.shift();
        const queuedUser = this.users.get(queuedUserId);

        if (queuedUser) {
            queuedUser.status = 'available';
            return this.createConversation(availableUser, queuedUser);
        }

        return null;
    }

    /**
     * Obtenir le partenaire d'un utilisateur
     */
    getPartner(userId) {
        const conversationId = this.userConversations.get(userId);
        if (!conversationId) return null;

        const conversation = this.conversations.get(conversationId);
        if (!conversation) return null;

        const partnerId = conversation.user1 === userId ? conversation.user2 : conversation.user1;
        return this.users.get(partnerId);
    }

    /**
     * Obtenir les statistiques du système
     */
    getStats() {
        const totalUsers = this.users.size;
        const availableUsers = Array.from(this.users.values()).filter(u => u.status === 'available').length;
        const usersInConversation = Array.from(this.users.values()).filter(u => u.status === 'in_conversation').length;
        const usersInQueue = this.queue.length;
        const activeConversations = this.conversations.size;

        return {
            totalUsers,
            availableUsers,
            usersInConversation,
            usersInQueue,
            activeConversations,
            queuePosition: (userId) => {
                const index = this.queue.indexOf(userId);
                return index >= 0 ? index + 1 : null;
            }
        };
    }

    /**
     * Obtenir l'état d'un utilisateur
     */
    getUserState(userId) {
        const user = this.users.get(userId);
        if (!user) return null;

        const stats = this.getStats();
        const partner = this.getPartner(userId);
        
        return {
            user: user,
            partner: partner,
            stats: stats,
            queuePosition: stats.queuePosition(userId)
        };
    }
}

module.exports = MatchmakingSystem;