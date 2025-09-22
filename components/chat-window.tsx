"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Send } from "lucide-react"
import { ChatMessage, User, TypingUser, CounterState } from "@/types"
import { CounterWidget } from "@/components/counter-widget"
import { ChatMessageComponent } from "./chat-message"

const TypingIndicator = ({ typingUsers }: { typingUsers: TypingUser[] }) => {
  if (typingUsers.length === 0) return null;

  const getTypingText = () => {
    if (typingUsers.length === 1) {
      return `${typingUsers[0].userName} is typing`;
    } else if (typingUsers.length === 2) {
      return `${typingUsers[0].userName} and ${typingUsers[1].userName} are typing`;
    } else {
      return `${typingUsers[0].userName} and ${typingUsers.length - 1} others are typing`;
    }
  };

  return (
    <div className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground">
      <div className="flex gap-1">
        <div className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
        <div className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
        <div className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce"></div>
      </div>
      <span>{getTypingText()}...</span>
    </div>
  );
};

export function ChatWindow({
  users,
  currentUser,
  chatMessages,
  typingUsers,
  counterState,
  sendChatMessage,
  handleTyping,
  stopTyping,
  onIncrementCounter,
  onDecrementCounter,
  onResetCounter,
  onDeleteChatMessage
}: {
  users: User[] | null
  currentUser: User | null
  chatMessages: ChatMessage[] | null
  typingUsers: TypingUser[]
  counterState: CounterState
  sendChatMessage: (message: string, options?: { expirationDuration?: number }) => void
  handleTyping: () => void
  stopTyping: () => void
  onIncrementCounter: () => void
  onDecrementCounter: () => void
  onResetCounter: () => void
  onDeleteChatMessage: (messageId: string) => void
}) {
  const [messageInput, setMessageInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
  }, [users, currentUser, typingUsers]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, typingUsers]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (messageInput.trim()) {
      sendChatMessage(messageInput);
      setMessageInput('');
    }
  };
  const handleSendMessageWithExpiration = (e: React.FormEvent) => {
    e.preventDefault();
    if (messageInput.trim()) {
      sendChatMessage(messageInput, { expirationDuration: 2000 });
      setMessageInput('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessageInput(e.target.value);
    handleTyping();
  };

  const handleInputBlur = () => {
    stopTyping();
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="flex h-full">
      <div className="flex-1 flex flex-col">
        <div className="border-l border-border/50 bg-background/50 backdrop-blur-sm p-6">
          <CounterWidget
            counterState={counterState}
            onIncrement={onIncrementCounter}
            onDecrement={onDecrementCounter}
            onReset={onResetCounter}
          />
        </div>
        <div className="flex items-center gap-3 px-6 py-4 bg-card/40 backdrop-blur-sm border-b border-border/50">
          <Avatar className="w-10 h-10">
            <AvatarFallback className="bg-muted text-muted-foreground">CD</AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-semibold text-foreground">{currentUser?.name}</h3>
            <p className="text-xs text-muted-foreground">{currentUser?.active ? "Online" : "Offline"}</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {chatMessages?.map((message) => (
            <ChatMessageComponent
              key={message.id}
              message={message}
              currentUser={currentUser}
              onDelete={onDeleteChatMessage}
            />
          ))}

          <TypingIndicator typingUsers={typingUsers} />

          <div ref={chatEndRef} />
        </div>

        <div className="p-6 bg-card/60 backdrop-blur-sm border-t border-border/50">
          <div className="flex gap-3 ">
            <Input
              ref={inputRef}
              value={messageInput}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              onBlur={handleInputBlur}
              placeholder="Type a message..."
              className="flex-1 bg-input/70 backdrop-blur-sm border-border/50 rounded-xl px-4 py-3 text-sm placeholder:text-muted-foreground focus:ring-2 focus:ring-ring/50"
            />
            <Button
              onClick={handleSendMessageWithExpiration}
              disabled={!messageInput.trim()}
              className="rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              With Expiration (2s)
            </Button>
            <Button
              onClick={handleSendMessage}
              size="icon"
              disabled={!messageInput.trim()}
              className="rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>


    </div>
  )
}