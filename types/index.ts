export interface User {
  id: string;
  name: string;
  lastActivity: number;
  active: boolean;
}

export interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  text: string;
  timestamp: number;
  isDeleted?: boolean;
  expiresAt?: number;
  isExpired?: boolean;
}

export interface UserMessage {
  type: 'join' | 'heartbeat' | 'inactive';
  user?: User;
  inactiveUsers?: User[];
  timestamp: number;
}

export interface ChatBroadcastMessage {
  type: 'message' | 'request_history' | 'history_response' | 'typing_start' | 'typing_stop' | 'delete_message' | 'expire_message'; // Added expire_message type
  message?: ChatMessage;
  messages?: ChatMessage[]; // For history responses
  requestingUserId?: string; // For history requests
  targetUserId?: string; // For targeted history responses
  userId?: string; // For typing indicators
  userName?: string; // For typing indicators
  messageId?: string; // For message deletion/expiration
  timestamp: number;
}

export interface TypingUser {
  userId: string;
  userName: string;
  timestamp: number;
}

export interface CounterState {
  value: number;
  lastAction: 'increment' | 'decrement' | 'reset' | null;
  lastActionUserId: string | null;
  lastActionUserName: string | null;
  lastActionTimestamp: number | null;
}

export interface CounterBroadcastMessage {
  type: 'counter_action' | 'counter_sync' | 'request_counter_state';
  action?: 'increment' | 'decrement' | 'reset';
  newValue?: number;
  userId?: string;
  userName?: string;
  counterState?: CounterState;
  requestingUserId?: string;
  timestamp: number;
}

export interface MessageOptions {
  expirationDuration?: number;
}