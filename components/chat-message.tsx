import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Trash2 } from 'lucide-react';
import { ChatMessage, User } from '@/types';

interface ChatMessageComponentProps {
    message: ChatMessage;
    currentUser: User | null;
    onDelete: (messageId: string) => void;
}

export function ChatMessageComponent({ message, currentUser, onDelete }: ChatMessageComponentProps) {
    const [showDeleteButton, setShowDeleteButton] = useState(false);
    const isOwnMessage = currentUser?.id === message.userId;

    if (message.isDeleted) {
        return (
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 ">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-semibold">
                    {message.userName.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-sm text-muted-foreground">{message.userName}</span>
                        <span className="text-xs text-muted-foreground">
                            {new Date(message.timestamp).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit'
                            })}
                        </span>
                    </div>
                    <div className="text-sm italic text-muted-foreground">
                        This message was deleted
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div
            // align right if own message
            className={`flex items-start gap-3 p-3 rounded-lg hover:bg-muted/30 transition-colors group relative ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
            onMouseEnter={() => setShowDeleteButton(true)}
            onMouseLeave={() => setShowDeleteButton(false)}
        >
            <div className='flex justify-between items-start gap-3 p-3 rounded-lg hover:bg-muted/30 transition-colors group relative'>
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                    {message.userName.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-sm">{message.userName}</span>
                        <span className="text-xs text-muted-foreground">
                            {new Date(message.timestamp).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit'
                            })}
                        </span>
                    </div>
                    <div className="text-sm break-words whitespace-pre-wrap">
                        {message.text}
                    </div>
                </div>

                {/* Delete button - only show for own messages */}
                {isOwnMessage && (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="absolute bottom-2 right-2 h-8 w-8 p-0"
                        onClick={() => onDelete(message.id)}
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                )}
            </div>
        </div>
    );
}