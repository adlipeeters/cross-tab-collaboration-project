"use client"

import { Navbar } from "@/components/navbar"
import { UserSidebar } from "@/components/user-sidebar"
import { ChatWindow } from "@/components/chat-window"
import { useCollaborativeSession } from "@/hooks/useCollaborativeSession";

export default function Home() {
  const { users, currentUser, chatMessages, sendChatMessage, typingUsers, handleTyping, stopTyping } = useCollaborativeSession();
  return (
    <div className="h-screen flex flex-col">
      <Navbar currentUser={currentUser} />
      <div className="flex-1 flex overflow-hidden">
        <UserSidebar users={users} />
        <div className="flex-1">
          <ChatWindow users={users} currentUser={currentUser} chatMessages={chatMessages} sendChatMessage={sendChatMessage} typingUsers={typingUsers} handleTyping={handleTyping} stopTyping={stopTyping} />
        </div>
      </div>
    </div>
  )
}
