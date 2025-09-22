"use client"

import { useState, useEffect, useRef, useCallback } from 'react';
import { useBroadcastChannel } from 'react-broadcast-sync';
import { ChatMessage, ChatBroadcastMessage, TypingUser, User } from '@/types';

export const useChatManagement = (currentUser: User | null, isInitialized: boolean) => {
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const isTypingRef = useRef(false);

    const { messages: chatBroadcastMessages, postMessage: postChatMessage } = useBroadcastChannel('chat', {
        keepLatestMessage: false,
        namespace: 'collaborative-session',
        cleaningInterval: 1000,
        deduplicationTTL: 5000,
    });

    const filterExpiredMessages = useCallback((messages: ChatMessage[]): ChatMessage[] => {
        const now = Date.now();
        return messages.filter(msg => {
            if (msg.expiresAt && msg.expiresAt <= now) {
                console.log('Filtering expired message:', msg.id, 'expiresAt:', msg.expiresAt, 'now:', now);
                return false;
            }
            return true;
        });
    }, []);

    // Request chat history on initialization
    useEffect(() => {
        if (isInitialized && currentUser) {
            postChatMessage('chat', {
                type: 'request_history',
                requestingUserId: currentUser.id,
                timestamp: Date.now()
            });
        }
    }, [isInitialized, currentUser]);

    // Handle chat messages
    useEffect(() => {
        if (!chatBroadcastMessages.length || !isInitialized || !currentUser) return;

        const broadcastMessage: ChatBroadcastMessage = chatBroadcastMessages[chatBroadcastMessages.length - 1].message;
        const messageAge = Date.now() - broadcastMessage.timestamp;
        const STALE_MESSAGE_THRESHOLD = 60000;

        switch (broadcastMessage.type) {
            case 'message':
                if (messageAge > STALE_MESSAGE_THRESHOLD) return;

                setChatMessages((prev): ChatMessage[] => {
                    const cleanedPrev = filterExpiredMessages(prev);
                    const messageExists = cleanedPrev.some((msg: ChatMessage) => msg.id === broadcastMessage.message?.id);
                    if (messageExists) return cleanedPrev;

                    const message = broadcastMessage.message || {} as ChatMessage;
                    console.log('Received message:', message.id, 'expiresAt:', message.expiresAt);
                    if (message.expiresAt && message.expiresAt <= Date.now()) {
                        console.log('Message already expired, not adding');
                        return cleanedPrev;
                    }

                    const newMessages = [...cleanedPrev, message];
                    return newMessages.slice(-100).sort((a: ChatMessage, b: ChatMessage) => a.timestamp - b.timestamp);
                });

                if (broadcastMessage.userId) {
                    setTypingUsers(prev => prev.filter(user => user.userId !== broadcastMessage.userId));
                }
                break;

            case 'typing_start':
                if (broadcastMessage.userId && broadcastMessage.userName && broadcastMessage.userId !== currentUser.id) {
                    setTypingUsers(prev => {
                        const existing = prev.find(user => user.userId === broadcastMessage.userId);
                        if (existing) {
                            return prev.map(user =>
                                user.userId === broadcastMessage.userId
                                    ? { ...user, timestamp: broadcastMessage.timestamp }
                                    : user
                            );
                        } else {
                            return [...prev, {
                                userId: broadcastMessage.userId!,
                                userName: broadcastMessage.userName!,
                                timestamp: broadcastMessage.timestamp
                            }];
                        }
                    });
                }
                break;

            case 'typing_stop':
                if (broadcastMessage.userId && broadcastMessage.userId !== currentUser.id) {
                    setTypingUsers(prev => prev.filter(user => user.userId !== broadcastMessage.userId));
                }
                break;

            case 'request_history':
                if (broadcastMessage.requestingUserId !== currentUser.id) {
                    const cleanedMessages = filterExpiredMessages(chatMessages);
                    if (cleanedMessages.length > 0) {
                        postChatMessage('chat', {
                            type: 'history_response',
                            messages: cleanedMessages,
                            targetUserId: broadcastMessage.requestingUserId,
                            timestamp: Date.now()
                        });
                    }
                }
                break;

            case 'history_response':
                if (broadcastMessage.targetUserId === currentUser.id && broadcastMessage.messages) {
                    setChatMessages(prev => {
                        const cleanedPrev = filterExpiredMessages(prev);
                        const cleanedIncoming = filterExpiredMessages(broadcastMessage.messages || []);

                        const allMessages = [...cleanedPrev, ...cleanedIncoming];
                        const uniqueMessages = allMessages.reduce((acc, message) => {
                            if (!acc.some((msg: ChatMessage) => msg.id === message.id)) {
                                acc.push(message);
                            }
                            return acc;
                        }, [] as ChatMessage[]);

                        const finalCleanedMessages = filterExpiredMessages(uniqueMessages);
                        return finalCleanedMessages.slice(-100).sort((a: ChatMessage, b: ChatMessage) => a.timestamp - b.timestamp);
                    });
                }
                break;

            case 'delete_message':
                if (messageAge > STALE_MESSAGE_THRESHOLD) return;

                if (broadcastMessage.messageId && broadcastMessage.userId) {
                    setChatMessages((prev): ChatMessage[] => {
                        const cleanedPrev = filterExpiredMessages(prev);
                        return cleanedPrev.map((msg: ChatMessage) => {
                            if (msg.id === broadcastMessage.messageId && msg.userId === broadcastMessage.userId) {
                                return { ...msg, isDeleted: true };
                            }
                            return msg;
                        });
                    });
                }
                break;
        }
    }, [chatBroadcastMessages, isInitialized, currentUser, filterExpiredMessages]);

    // Clean up stale typing indicators
    useEffect(() => {
        const cleanupInterval = setInterval(() => {
            const now = Date.now();
            const TYPING_TIMEOUT = 3000;

            setTypingUsers(prev => {
                const filtered = prev.filter(user => now - user.timestamp < TYPING_TIMEOUT);
                return filtered;
            });
        }, 1000);

        return () => clearInterval(cleanupInterval);
    }, []);

    // Periodic cleanup for expired messages
    useEffect(() => {
        const cleanupInterval = setInterval(() => {
            setChatMessages(prev => filterExpiredMessages(prev));
        }, 5000);

        return () => clearInterval(cleanupInterval);
    }, [filterExpiredMessages]);

    // Typing functions
    const startTyping = useCallback(() => {
        if (!currentUser || isTypingRef.current) return;

        isTypingRef.current = true;
        postChatMessage('chat', {
            type: 'typing_start',
            userId: currentUser.id,
            userName: currentUser.name,
            timestamp: Date.now()
        });
    }, [currentUser, postChatMessage]);

    const stopTyping = useCallback(() => {
        if (!currentUser || !isTypingRef.current) return;

        isTypingRef.current = false;
        postChatMessage('chat', {
            type: 'typing_stop',
            userId: currentUser.id,
            userName: currentUser.name,
            timestamp: Date.now()
        });
    }, [currentUser, postChatMessage]);

    const handleTyping = useCallback(() => {
        if (!currentUser) return;

        if (!isTypingRef.current) {
            startTyping();
        }

        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }

        typingTimeoutRef.current = setTimeout(() => {
            stopTyping();
        }, 2000);
    }, [currentUser, startTyping, stopTyping]);

    const sendChatMessage = useCallback((text: string, options?: { expirationDuration?: number }) => {
        if (!currentUser || !text.trim()) return;

        if (isTypingRef.current) {
            stopTyping();
        }

        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = null;
        }

        const chatMessage: ChatMessage = {
            id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            userId: currentUser.id,
            userName: currentUser.name,
            text: text.trim(),
            timestamp: Date.now(),
            expiresAt: options?.expirationDuration ? Date.now() + options.expirationDuration : undefined
        };

        setChatMessages(prev => {
            const cleanedPrev = filterExpiredMessages(prev);
            const newMessages = [...cleanedPrev, chatMessage];
            return newMessages.slice(-100).sort((a, b) => a.timestamp - b.timestamp);
        });

        const messageOptions = options?.expirationDuration
            ? { expirationDuration: options.expirationDuration }
            : undefined;

        const broadcastPayload = {
            type: 'message',
            message: chatMessage,
            userId: currentUser.id,
            timestamp: Date.now()
        };

        console.log('Sending message:', chatMessage.id, 'with expiresAt:', chatMessage.expiresAt);
        postChatMessage('chat', broadcastPayload, messageOptions);
    }, [currentUser, filterExpiredMessages, stopTyping, postChatMessage]);

    const deleteChatMessage = useCallback((messageId: string) => {
        if (!currentUser) return;

        setChatMessages(prev => {
            const cleanedPrev = filterExpiredMessages(prev);
            return cleanedPrev.map(msg => {
                if (msg.id === messageId && msg.userId === currentUser.id) {
                    return { ...msg, isDeleted: true };
                }
                return msg;
            });
        });

        postChatMessage('chat', {
            type: 'delete_message',
            messageId: messageId,
            userId: currentUser.id,
            timestamp: Date.now()
        });
    }, [currentUser, postChatMessage, filterExpiredMessages]);

    return {
        chatMessages,
        typingUsers,
        sendChatMessage,
        deleteChatMessage,
        handleTyping,
        stopTyping
    };
};