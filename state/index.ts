import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { generateUsername } from '@/lib/utils';
import { User, ChatMessage, TypingUser } from '@/types';

interface CollaborativeState {
    // State
    users: User[];
    currentUser: User | null;
    chatMessages: ChatMessage[];
    typingUsers: TypingUser[];
    isInitialized: boolean;

    // Actions
    setCurrentUser: (user: User) => void;
    addUser: (user: User) => void;
    updateUser: (userId: string, updates: Partial<User>) => void;
    setUsersInactive: (userIds: string[]) => void;
    addChatMessage: (message: ChatMessage) => void;
    setChatMessages: (messages: ChatMessage[]) => void;
    mergeChatMessages: (messages: ChatMessage[]) => void;
    addTypingUser: (user: TypingUser) => void;
    removeTypingUser: (userId: string) => void;
    updateTypingUser: (userId: string, timestamp: number) => void;
    cleanupStaleTypingUsers: () => void;
    setInitialized: (initialized: boolean) => void;

    // Computed
    activeUsers: () => User[];
    sortedChatMessages: () => ChatMessage[];
}

export const useCollaborativeStore = create<CollaborativeState>()(
    subscribeWithSelector((set, get) => ({
        // Initial state
        users: [],
        currentUser: null,
        chatMessages: [],
        typingUsers: [],
        isInitialized: false,

        // Actions
        setCurrentUser: (user) => set({ currentUser: user }),

        addUser: (user) => set((state) => {
            const existingIndex = state.users.findIndex(u => u.id === user.id);
            if (existingIndex === -1) {
                return { users: [...state.users, user] };
            } else {
                // Update existing user
                const updatedUsers = [...state.users];
                updatedUsers[existingIndex] = { ...updatedUsers[existingIndex], ...user, active: true };
                return { users: updatedUsers };
            }
        }),

        updateUser: (userId, updates) => set((state) => ({
            users: state.users.map(user =>
                user.id === userId ? { ...user, ...updates } : user
            )
        })),

        setUsersInactive: (userIds) => set((state) => ({
            users: state.users.map(user =>
                userIds.includes(user.id) ? { ...user, active: false } : user
            )
        })),

        addChatMessage: (message) => set((state) => {
            // Check for duplicates
            const exists = state.chatMessages.some(msg => msg.id === message.id);
            if (exists) return state;

            const newMessages = [...state.chatMessages, message];
            return {
                chatMessages: newMessages.slice(-100).sort((a, b) => a.timestamp - b.timestamp)
            };
        }),

        setChatMessages: (messages) => set({ chatMessages: messages }),

        mergeChatMessages: (messages) => set((state) => {
            const allMessages = [...state.chatMessages, ...messages];
            const uniqueMessages = allMessages.reduce((acc, message) => {
                if (!acc.some(msg => msg.id === message.id)) {
                    acc.push(message);
                }
                return acc;
            }, [] as ChatMessage[]);

            return {
                chatMessages: uniqueMessages.slice(-100).sort((a, b) => a.timestamp - b.timestamp)
            };
        }),

        addTypingUser: (user) => set((state) => {
            const existingIndex = state.typingUsers.findIndex(u => u.userId === user.userId);
            if (existingIndex === -1) {
                return { typingUsers: [...state.typingUsers, user] };
            } else {
                // Update existing typing user
                const updatedTypingUsers = [...state.typingUsers];
                updatedTypingUsers[existingIndex] = user;
                return { typingUsers: updatedTypingUsers };
            }
        }),

        removeTypingUser: (userId) => set((state) => ({
            typingUsers: state.typingUsers.filter(user => user.userId !== userId)
        })),

        updateTypingUser: (userId, timestamp) => set((state) => ({
            typingUsers: state.typingUsers.map(user =>
                user.userId === userId ? { ...user, timestamp } : user
            )
        })),

        cleanupStaleTypingUsers: () => set((state) => {
            const now = Date.now();
            const TYPING_TIMEOUT = 3000;
            return {
                typingUsers: state.typingUsers.filter(user => now - user.timestamp < TYPING_TIMEOUT)
            };
        }),

        setInitialized: (initialized) => set({ isInitialized: initialized }),

        // Computed values
        activeUsers: () => get().users.filter(user => user.active),
        sortedChatMessages: () => [...get().chatMessages].sort((a, b) => a.timestamp - b.timestamp),
    }))
);

// Helper function to create a new user
export const createNewUser = (): User => ({
    id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name: generateUsername(),
    lastActivity: Date.now(),
    active: true
});