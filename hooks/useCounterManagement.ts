"use client"

import { useState, useEffect, useCallback } from 'react';
import { useBroadcastChannel } from 'react-broadcast-sync';
import { CounterState, CounterBroadcastMessage, User } from '@/types';

export const useCounterManagement = (currentUser: User | null, isInitialized: boolean) => {
  const [counterState, setCounterState] = useState<CounterState>({
    value: 0,
    lastAction: null,
    lastActionUserId: null,
    lastActionUserName: null,
    lastActionTimestamp: null
  });

  const { messages: counterMessages, postMessage: postCounterMessage } = useBroadcastChannel('counter', {
    keepLatestMessage: false,
    namespace: 'collaborative-session',
    cleaningInterval: 2000,
    deduplicationTTL: 5000,
  });

  // Request counter state on initialization
  useEffect(() => {
    if (isInitialized && currentUser) {
      postCounterMessage('counter', {
        type: 'request_counter_state',
        requestingUserId: currentUser.id,
        timestamp: Date.now()
      });
    }
  }, [isInitialized, currentUser]);

  // Handle counter messages
  useEffect(() => {
    if (!counterMessages.length || !isInitialized || !currentUser) return;

    const message: CounterBroadcastMessage = counterMessages[counterMessages.length - 1].message;
    const messageAge = Date.now() - message.timestamp;
    const STALE_MESSAGE_THRESHOLD = 10000;

    if (messageAge > STALE_MESSAGE_THRESHOLD) return;

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

  return {
    counterState,
    incrementCounter,
    decrementCounter,
    resetCounter
  };
};