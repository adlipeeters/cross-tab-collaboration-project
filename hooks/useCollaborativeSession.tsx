"use client"

import { generateUsername } from '@/lib/utils';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useBroadcastChannel } from 'react-broadcast-sync';
import { User, ChatMessage, UserMessage, ChatBroadcastMessage, TypingUser, CounterState, CounterBroadcastMessage } from '@/types';

export const useCollaborativeSession = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [counterState, setCounterState] = useState<CounterState>({
    value: 0,
    lastAction: null,
    lastActionUserId: null,
    lastActionUserName: null,
    lastActionTimestamp: null
  });
  const userRef = useRef<User | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingRef = useRef(false);

  const { messages: userMessages, postMessage: postUserMessage } = useBroadcastChannel('users', {
    keepLatestMessage: false,
    namespace: 'collaborative-session',
    cleaningInterval: 2000,
    deduplicationTTL: 10000,
  });

  const { messages: chatBroadcastMessages, postMessage: postChatMessage } = useBroadcastChannel('chat', {
    keepLatestMessage: false,
    namespace: 'collaborative-session',
    cleaningInterval: 1000,
    deduplicationTTL: 5000,
  });

  const { messages: counterMessages, postMessage: postCounterMessage } = useBroadcastChannel('counter', {
    keepLatestMessage: false,
    namespace: 'collaborative-session',
    cleaningInterval: 2000,
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

    postChatMessage('chat', {
      type: 'request_history',
      requestingUserId: newUser.id,
      timestamp: Date.now()
    });

    postCounterMessage('counter', {
      type: 'request_counter_state',
      requestingUserId: newUser.id,
      timestamp: Date.now()
    });

    setIsInitialized(true);

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

    return () => {
      clearInterval(heartbeatInterval);
    };
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

            if (messageAge > STALE_MESSAGE_THRESHOLD) {
              break;
            }

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
            const STALE_MESSAGE_THRESHOLD = 10000;

            if (messageAge > STALE_MESSAGE_THRESHOLD) {
              break;
            }

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

            if (messageAge > STALE_MESSAGE_THRESHOLD) {
              break;
            }

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

  // Handle chat messages
  useEffect(() => {
    if (!chatBroadcastMessages.length || !isInitialized || !currentUser) return;

    const broadcastMessage: ChatBroadcastMessage = chatBroadcastMessages[chatBroadcastMessages.length - 1].message;
    const messageAge = Date.now() - broadcastMessage.timestamp;
    const STALE_MESSAGE_THRESHOLD = 60000;

    switch (broadcastMessage.type) {
      case 'message':
        if (messageAge > STALE_MESSAGE_THRESHOLD) {
          return;
        }

        setChatMessages((prev): ChatMessage[] => {
          const cleanedPrev = filterExpiredMessages(prev);
          const messageExists = cleanedPrev.some((msg: ChatMessage) => msg.id === broadcastMessage.message?.id);
          if (messageExists) {
            return cleanedPrev;
          }

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
        if (messageAge > STALE_MESSAGE_THRESHOLD) {
          return;
        }

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

  // Handle counter messages
  useEffect(() => {
    if (!counterMessages.length || !isInitialized || !currentUser) return;

    const message: CounterBroadcastMessage = counterMessages[counterMessages.length - 1].message;
    const messageAge = Date.now() - message.timestamp;
    const STALE_MESSAGE_THRESHOLD = 10000;

    if (messageAge > STALE_MESSAGE_THRESHOLD) {
      return;
    }

    switch (message.type) {
      case 'counter_action':
        if (message.newValue !== undefined && message.action && message.userId && message.userName) {
          setCounterState({
            value: message.newValue,
            lastAction: message.action,
            lastActionUserId: message.userId,
            lastActionUserName: message.userName,
            lastActionTimestamp: message.timestamp
          });
        }
        break;

      case 'request_counter_state':
        if (message.requestingUserId !== currentUser.id && counterState.lastActionTimestamp !== null) {
          postCounterMessage('counter', {
            type: 'counter_sync',
            counterState: counterState,
            timestamp: Date.now()
          });
        }
        break;

      case 'counter_sync':
        if (message.counterState &&
          (counterState.lastActionTimestamp === null ||
            (message.counterState.lastActionTimestamp !== null &&
              message.counterState.lastActionTimestamp > counterState.lastActionTimestamp))) {
          setCounterState(message.counterState);
        }
        break;
    }
  }, [counterMessages, isInitialized, currentUser, counterState.lastActionTimestamp]);

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

  // Typing indicator functions
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

  // Send chat message function
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

  // Counter functions
  const incrementCounter = useCallback(() => {
    if (!currentUser) return;

    const newValue = counterState.value + 1;
    const timestamp = Date.now();

    setCounterState({
      value: newValue,
      lastAction: 'increment',
      lastActionUserId: currentUser.id,
      lastActionUserName: currentUser.name,
      lastActionTimestamp: timestamp
    });

    postCounterMessage('counter', {
      type: 'counter_action',
      action: 'increment',
      newValue: newValue,
      userId: currentUser.id,
      userName: currentUser.name,
      timestamp: timestamp
    });
  }, [currentUser, counterState.value, postCounterMessage]);

  const decrementCounter = useCallback(() => {
    if (!currentUser) return;

    const newValue = counterState.value - 1;
    const timestamp = Date.now();

    setCounterState({
      value: newValue,
      lastAction: 'decrement',
      lastActionUserId: currentUser.id,
      lastActionUserName: currentUser.name,
      lastActionTimestamp: timestamp
    });

    postCounterMessage('counter', {
      type: 'counter_action',
      action: 'decrement',
      newValue: newValue,
      userId: currentUser.id,
      userName: currentUser.name,
      timestamp: timestamp
    });
  }, [currentUser, counterState.value, postCounterMessage]);

  const resetCounter = useCallback(() => {
    if (!currentUser) return;

    const newValue = 0;
    const timestamp = Date.now();

    setCounterState({
      value: newValue,
      lastAction: 'reset',
      lastActionUserId: currentUser.id,
      lastActionUserName: currentUser.name,
      lastActionTimestamp: timestamp
    });

    postCounterMessage('counter', {
      type: 'counter_action',
      action: 'reset',
      newValue: newValue,
      userId: currentUser.id,
      userName: currentUser.name,
      timestamp: timestamp
    });
  }, [currentUser, postCounterMessage]);

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
    users,
    currentUser,
    chatMessages,
    typingUsers,
    counterState,
    sendChatMessage,
    deleteChatMessage,
    handleTyping,
    stopTyping,
    incrementCounter,
    decrementCounter,
    resetCounter
  };
};