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
    type: 'message';
    message: ChatMessage;
    timestamp: number;
  }