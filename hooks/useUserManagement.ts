"use client"

import { useState, useEffect, useRef, useCallback } from 'react';
import { useBroadcastChannel } from 'react-broadcast-sync';
import { User, UserMessage } from '@/types';
import { generateUsername } from '@/lib/utils';

export const useUserManagement = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [isInitialized, setIsInitialized] = useState(false);
    const userRef = useRef<User | null>(null);

    const { messages: userMessages, postMessage: postUserMessage } = useBroadcastChannel('users', {
        keepLatestMessage: false,
        namespace: 'collaborative-session',
        cleaningInterval: 2000,
        deduplicationTTL: 10000,
    });

    // Initialize current user
    useEffect(() => {
        const newUser: User = {
            id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name: generateUsername(),
            lastActivity: Date.now(),
            active: true
        };

        userRef.current = newUser;
        setCurrentUser(newUser);
        setUsers(prev => [...prev, newUser]);

        postUserMessage('users', {
            type: 'join',
            user: newUser,
            timestamp: Date.now()
        });

        setIsInitialized(true);

        // Heartbeat interval
        const heartbeatInterval = setInterval(() => {
            if (userRef.current) {
                const updatedUser = {
                    ...userRef.current,
                    lastActivity: Date.now(),
                    active: true
                };
                userRef.current = updatedUser;

                setUsers(prev =>
                    prev.map(u => u.id === updatedUser.id ? updatedUser : u)
                );

                postUserMessage('users', {
                    type: 'heartbeat',
                    user: updatedUser,
                    timestamp: Date.now()
                });
            }
        }, 1000);

        return () => clearInterval(heartbeatInterval);
    }, []);

    // Handle user messages
    useEffect(() => {
        if (!userMessages.length) return;

        const message: UserMessage = userMessages[userMessages.length - 1].message;

        setUsers(prevUsers => {
            const updatedUsers = [...prevUsers];

            switch (message.type) {
                case 'join':
                    if (message.user) {
                        const messageAge = Date.now() - message.timestamp;
                        const STALE_MESSAGE_THRESHOLD = 10000;

                        if (messageAge > STALE_MESSAGE_THRESHOLD) break;

                        const existingUserIndex = updatedUsers.findIndex(u => u.id === message.user!.id);
                        if (existingUserIndex === -1) {
                            updatedUsers.push(message.user);
                        } else {
                            updatedUsers[existingUserIndex] = {
                                ...updatedUsers[existingUserIndex],
                                active: true,
                                lastActivity: message.user.lastActivity
                            };
                        }
                    }
                    break;

                case 'heartbeat':
                    if (message.user) {
                        const messageAge = Date.now() - message.timestamp;
                        const STALE_MESSAGE_THRESHOLD = 2000;

                        if (messageAge > STALE_MESSAGE_THRESHOLD) break;

                        const existingUserIndex = updatedUsers.findIndex(u => u.id === message.user!.id);
                        if (existingUserIndex !== -1) {
                            updatedUsers[existingUserIndex] = {
                                ...updatedUsers[existingUserIndex],
                                lastActivity: message.user.lastActivity,
                                active: true
                            };
                        } else {
                            updatedUsers.push(message.user);
                        }
                    }
                    break;

                case 'inactive':
                    if (message.inactiveUsers) {
                        const messageAge = Date.now() - message.timestamp;
                        const STALE_MESSAGE_THRESHOLD = 10000;

                        if (messageAge > STALE_MESSAGE_THRESHOLD) break;

                        message.inactiveUsers.forEach(inactiveUser => {
                            const userIndex = updatedUsers.findIndex(u => u.id === inactiveUser.id);
                            if (userIndex !== -1) {
                                updatedUsers[userIndex] = {
                                    ...updatedUsers[userIndex],
                                    active: false
                                };
                            }
                        });
                    }
                    break;
            }

            return updatedUsers;
        });
    }, [userMessages]);

    // Mark inactive users
    useEffect(() => {
        const INACTIVE_TIMEOUT = 3000;

        const inactivityCheck = setInterval(() => {
            const now = Date.now();

            setUsers(prevUsers => {
                const inactiveUsers: User[] = [];
                const updatedUsers = prevUsers.map(user => {
                    const timeSinceLastActivity = now - user.lastActivity;
                    const shouldBeInactive = timeSinceLastActivity >= INACTIVE_TIMEOUT;
                    const isCurrentUser = user.id === userRef.current?.id;

                    if (shouldBeInactive && user.active && !isCurrentUser) {
                        inactiveUsers.push(user);
                        return { ...user, active: false };
                    }

                    return user;
                });

                if (inactiveUsers.length > 0) {
                    postUserMessage('users', {
                        type: 'inactive',
                        inactiveUsers: inactiveUsers,
                        timestamp: Date.now()
                    });
                }

                return updatedUsers;
            });
        }, 1000);

        return () => clearInterval(inactivityCheck);
    }, []);

    return {
        users,
        currentUser,
        isInitialized,
        postUserMessage
    };
};