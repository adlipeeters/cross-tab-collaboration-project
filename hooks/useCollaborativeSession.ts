"use client"

import { useUserManagement } from './useUserManagement';
import { useChatManagement } from './useChatManagement';
import { useCounterManagement } from './useCounterManagement';

export const useCollaborativeSession = () => {
  const {
    users,
    currentUser,
    isInitialized
  } = useUserManagement();

  const {
    chatMessages,
    typingUsers,
    sendChatMessage,
    deleteChatMessage,
    handleTyping,
    stopTyping
  } = useChatManagement(currentUser, isInitialized);

  const {
    counterState,
    incrementCounter,
    decrementCounter,
    resetCounter
  } = useCounterManagement(currentUser, isInitialized);

  return {
    // User management
    users,
    currentUser,

    // Chat management
    chatMessages,
    typingUsers,
    sendChatMessage,
    deleteChatMessage,
    handleTyping,
    stopTyping,

    // Counter management
    counterState,
    incrementCounter,
    decrementCounter,
    resetCounter
  };
};