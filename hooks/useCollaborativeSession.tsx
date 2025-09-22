"use client"

import { generateUsername } from '@/lib/utils';
import { useState, useEffect, useRef } from 'react';
import { useBroadcastChannel } from 'react-broadcast-sync';
import { User, ChatMessage, UserMessage, ChatBroadcastMessage } from '@/types';

export const useCollaborativeSession = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const userRef = useRef<User | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  const { messages: userMessages, postMessage: postUserMessage } = useBroadcastChannel('users', {
    keepLatestMessage: false,
    namespace: 'collaborative-session',
  });

  const { messages: chatBroadcastMessages, postMessage: postChatMessage } = useBroadcastChannel('chat', {
    keepLatestMessage: false,
    namespace: 'collaborative-session',
  });

  // Initialize current user
  useEffect(() => {
    const newUser: User = {
      id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: generateUsername(),
      lastActivity: Date.now(),
      active: true
    };

    console.log('Initializing new user:', newUser);
    userRef.current = newUser;
    setCurrentUser(newUser);

    // Add current user to users array immediately
    setUsers(prev => {
      const updated = [...prev, newUser];
      console.log('Updated users after adding current user:', updated);
      return updated;
    });

    // Broadcast new user joined
    postUserMessage('users', {
      type: 'join',
      user: newUser,
      timestamp: Date.now()
    });

    // Request chat history from existing users
    postChatMessage('chat', {
      type: 'request_history',
      requestingUserId: newUser.id,
      timestamp: Date.now()
    });

    setIsInitialized(true);

    // Set up heartbeat interval
    const heartbeatInterval = setInterval(() => {
      if (userRef.current) {
        const updatedUser = {
          ...userRef.current,
          lastActivity: Date.now(),
          active: true
        };
        userRef.current = updatedUser;

        // Update local state for current user
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

    // Cleanup on unmount
    return () => {
      clearInterval(heartbeatInterval);
    };
  }, []);

  // Handle user messages
  useEffect(() => {
    if (!userMessages.length) return;

    const message: UserMessage = userMessages[userMessages.length - 1].message;
    console.log('Processing user message:', message);

    setUsers(prevUsers => {
      const updatedUsers = [...prevUsers];

      switch (message.type) {
        case 'join':
          if (message.user) {
            const messageAge = Date.now() - message.timestamp;
            const STALE_MESSAGE_THRESHOLD = 10000;

            if (messageAge > STALE_MESSAGE_THRESHOLD) {
              console.log(`⚠️ Ignoring stale join message from ${message.user.name}`);
              break;
            }

            const existingUserIndex = updatedUsers.findIndex(u => u.id === message.user!.id);
            if (existingUserIndex === -1) {
              updatedUsers.push(message.user);
              console.log(`🟢 ${message.user.name} joined`);
            } else {
              // User exists, mark as active
              updatedUsers[existingUserIndex] = {
                ...updatedUsers[existingUserIndex],
                active: true,
                lastActivity: message.user.lastActivity
              };
              console.log(`🟢 ${message.user.name} reactivated`);
            }
          }
          break;

        case 'heartbeat':
          if (message.user) {
            const messageAge = Date.now() - message.timestamp;
            const STALE_MESSAGE_THRESHOLD = 10000;

            if (messageAge > STALE_MESSAGE_THRESHOLD) {
              console.log(`⚠️ Ignoring stale heartbeat from ${message.user.name}`);
              break;
            }

            const existingUserIndex = updatedUsers.findIndex(u => u.id === message.user!.id);
            if (existingUserIndex !== -1) {
              updatedUsers[existingUserIndex] = {
                ...updatedUsers[existingUserIndex],
                lastActivity: message.user.lastActivity,
                active: true
              };
              console.log(`💓 ${message.user.name} heartbeat updated`);
            } else {
              // New user from heartbeat
              updatedUsers.push(message.user);
              console.log(`🟢 ${message.user.name} added via heartbeat`);
            }
          }
          break;

        case 'inactive':
          if (message.inactiveUsers) {
            const messageAge = Date.now() - message.timestamp;
            const STALE_MESSAGE_THRESHOLD = 10000;

            if (messageAge > STALE_MESSAGE_THRESHOLD) {
              console.log(`⚠️ Ignoring stale inactive message`);
              break;
            }

            // Mark users as inactive
            message.inactiveUsers.forEach(inactiveUser => {
              const userIndex = updatedUsers.findIndex(u => u.id === inactiveUser.id);
              if (userIndex !== -1) {
                updatedUsers[userIndex] = {
                  ...updatedUsers[userIndex],
                  active: false
                };
                console.log(`😴 ${inactiveUser.name} marked as inactive`);
              }
            });
          }
          break;
      }

      console.log('Updated users array:', updatedUsers);
      return updatedUsers;
    });
  }, [userMessages]);

  // Handle chat messages
  useEffect(() => {
    if (!chatBroadcastMessages.length || !isInitialized) return;

    const broadcastMessage: ChatBroadcastMessage = chatBroadcastMessages[chatBroadcastMessages.length - 1].message;
    console.log('Processing chat message:', broadcastMessage);

    const messageAge = Date.now() - broadcastMessage.timestamp;
    const STALE_MESSAGE_THRESHOLD = 60000; // 1 minute for chat messages

    switch (broadcastMessage.type) {
      case 'message':
        if (messageAge > STALE_MESSAGE_THRESHOLD) {
          console.log(`⚠️ Ignoring stale chat message`);
          return;
        }

        setChatMessages((prev): ChatMessage[] => {
          // Check if message already exists to prevent duplicates
          const messageExists = prev.some((msg: ChatMessage) => msg.id === broadcastMessage.message?.id);
          if (messageExists) {
            return prev;
          }

          const newMessages = [...prev, broadcastMessage.message || {} as ChatMessage];
          // Keep only last 100 messages to prevent memory issues
          return newMessages.slice(-100).sort((a: ChatMessage, b: ChatMessage) => a.timestamp - b.timestamp);
        });
        break;

      case 'request_history':
        // If someone requests history and we have messages, send them
        if (chatMessages.length > 0 && broadcastMessage.requestingUserId !== currentUser?.id) {
          console.log(`📚 Sending chat history to ${broadcastMessage.requestingUserId}`);
          postChatMessage('chat', {
            type: 'history_response',
            messages: chatMessages,
            targetUserId: broadcastMessage.requestingUserId,
            timestamp: Date.now()
          });
        }
        break;

      case 'history_response':
        // If this history response is for us, merge it with our messages
        if (broadcastMessage.targetUserId === currentUser?.id && broadcastMessage.messages) {
          console.log(`📖 Received chat history: ${broadcastMessage.messages.length} messages`);

          setChatMessages(prev => {
            // Merge histories, remove duplicates, and sort by timestamp
            const allMessages = [...prev, ...(broadcastMessage.messages || [])];
            const uniqueMessages = allMessages.reduce((acc, message) => {
              if (!acc.some((msg: ChatMessage) => msg.id === message.id)) {
                acc.push(message);
              }
              return acc;
            }, [] as ChatMessage[]);

            return uniqueMessages.slice(-100).sort((a: ChatMessage, b: ChatMessage) => a.timestamp - b.timestamp);
          });
        }
        break;
    }
  }, [chatBroadcastMessages, isInitialized, currentUser?.id]);

  // Mark inactive users
  useEffect(() => {
    const INACTIVE_TIMEOUT = 3000; // 3 seconds timeout

    const inactivityCheck = setInterval(() => {
      const now = Date.now();

      setUsers(prevUsers => {
        console.log("Checking for inactive users:", prevUsers);

        const inactiveUsers: User[] = [];
        const updatedUsers = prevUsers.map(user => {
          const timeSinceLastActivity = now - user.lastActivity;
          const shouldBeInactive = timeSinceLastActivity >= INACTIVE_TIMEOUT;
          const isCurrentUser = user.id === userRef.current?.id;

          if (shouldBeInactive && user.active && !isCurrentUser) {
            console.log(`😴 ${user.name} becoming inactive (${timeSinceLastActivity}ms since last activity)`);
            inactiveUsers.push(user);
            return { ...user, active: false };
          }

          return user;
        });

        // Broadcast inactive users if any
        if (inactiveUsers.length > 0) {
          console.log(`Broadcasting inactive status for ${inactiveUsers.length} users:`, inactiveUsers.map(u => u.name));
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

  // Send chat message function
  const sendChatMessage = (text: string) => {
    if (!currentUser || !text.trim()) return;

    const chatMessage: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userId: currentUser.id,
      userName: currentUser.name,
      text: text.trim(),
      timestamp: Date.now()
    };

    // Add to local state immediately for instant feedback
    setChatMessages(prev => {
      const newMessages = [...prev, chatMessage];
      // Keep only the last 100 messages to prevent memory issues
      return newMessages.slice(-100).sort((a, b) => a.timestamp - b.timestamp);
    });

    // Broadcast to other tabs
    postChatMessage('chat', {
      type: 'message',
      message: chatMessage,
      timestamp: Date.now()
    });

    console.log(`💬 ${currentUser.name} sent: "${text}"`);
  };

  return {
    users,
    currentUser,
    chatMessages,
    sendChatMessage
  };
};