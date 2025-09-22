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
  }
  
  export interface UserMessage {
    type: 'join' | 'heartbeat' | 'inactive';
    user?: User;
    inactiveUsers?: User[];
    timestamp: number;
  }
  
export interface ChatBroadcastMessage {
  type: 'message' | 'request_history' | 'history_response';
  message?: ChatMessage;
  messages?: ChatMessage[]; // For history responses
  requestingUserId?: string; // For history requests
  targetUserId?: string; // For targeted history responses
  timestamp: number;
}