"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Send } from "lucide-react"
import { ChatMessage, User } from "@/types"



export function ChatWindow({
  users,
  currentUser,
  chatMessages,
  sendChatMessage
}: {
  users: User[] | null
  currentUser: User | null
  chatMessages: ChatMessage[] | null
  sendChatMessage: (message: string) => void
}) {
  const [messageInput, setMessageInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    console.log('Page render - Current users:', users);
    console.log('Page render - Current user:', currentUser);
  }, [users, currentUser]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const activeUsers = users?.filter(u => u.active);
  const inactiveUsers = users?.filter(u => !u.active);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (messageInput.trim()) {
      sendChatMessage(messageInput);
      setMessageInput('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-6 py-4 bg-card/40 backdrop-blur-sm border-b border-border/50">
        <Avatar className="w-10 h-10">
          <AvatarFallback className="bg-muted text-muted-foreground">CD</AvatarFallback>
        </Avatar>
        <div>
          <h3 className="font-semibold text-foreground">{currentUser?.name}</h3>
          <p className="text-xs text-muted-foreground">{currentUser?.active ? "Online" : "Offline"}</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {chatMessages?.map((message) => (
          <div key={message.id} className="space-y-1">
            <div className="text-xs text-muted-foreground">{formatTime(message.timestamp)}</div>
            <div
              className={`max-w-[80%] p-3 rounded-2xl text-pretty ${message.userId === currentUser?.id
                ? "ml-auto bg-black text-white dark:bg-white dark:text-black dark:border dark:border-gray-300"
                : "bg-gray-200 text-black dark:bg-gray-800 dark:text-white dark:border dark:border-gray-700"
                }`}
            >
              {message.text}
            </div>
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>

      {/* Input */}
      <div className="p-6 bg-card/60 backdrop-blur-sm border-t border-border/50">
        <div className="flex gap-3">
          <Input
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            className="flex-1 bg-input/70 backdrop-blur-sm border-border/50 rounded-xl px-4 py-3 text-sm placeholder:text-muted-foreground focus:ring-2 focus:ring-ring/50"
          />
          <Button
            onClick={handleSendMessage}
            size="icon"
            className="rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
