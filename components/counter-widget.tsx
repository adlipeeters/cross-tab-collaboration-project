"use client"

import type React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Minus, RotateCcw } from "lucide-react"
import { CounterState } from "@/types"

export function CounterWidget({
    counterState,
    onIncrement,
    onDecrement,
    onReset
}: {
    counterState: CounterState
    onIncrement: () => void
    onDecrement: () => void
    onReset: () => void
}) {
    const formatTime = (timestamp: number | null) => {
        if (!timestamp) return '';
        return new Date(timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    };

    const getActionText = (action: string | null) => {
        switch (action) {
            case 'increment':
                return 'incremented';
            case 'decrement':
                return 'decremented';
            case 'reset':
                return 'reset';
            default:
                return 'initialized';
        }
    };

    return (
        <Card className="w-full  bg-card/80 backdrop-blur-sm border-border/50" >
            <CardContent className="h-full flex flex-col lg:flex-row justify-between items-center">
                <div className="text-center">
                    <div className="text-xl font-bold text-primary tabular-nums">
                        {counterState.value}
                    </div>

                    {counterState.lastActionUserName && counterState.lastActionTimestamp && (
                        <div className="text-sm text-muted-foreground space-y-1">
                            <div>
                                <span className="font-medium">{counterState.lastActionUserName}</span> {getActionText(counterState.lastAction)} the counter
                            </div>
                            <div className="text-xs">
                                at {formatTime(counterState.lastActionTimestamp)}
                            </div>
                        </div>
                    )}

                    {!counterState.lastActionUserName && (
                        <div className="text-sm text-muted-foreground">
                            No actions yet
                        </div>
                    )}
                </div>

                <div className="flex items-center justify-center gap-2">
                    <Button
                        onClick={onDecrement}
                        size="sm"
                        variant="outline"
                        className="w-12 h-12 rounded-full p-0 hover:bg-destructive/10 hover:border-destructive/50 hover:text-destructive transition-colors"
                    >
                        <Minus className="w-5 h-5" />
                    </Button>

                    <Button
                        onClick={onReset}
                        size="sm"
                        variant="outline"
                        className="px-4 h-10 rounded-full hover:bg-muted/80 transition-colors"
                    >
                        <RotateCcw className="w-4 h-4 mr-1" />
                        Reset
                    </Button>

                    <Button
                        onClick={onIncrement}
                        size="sm"
                        variant="outline"
                        className="w-12 h-12 rounded-full p-0 hover:bg-primary/10 hover:border-primary/50 hover:text-primary transition-colors"
                    >
                        <Plus className="w-5 h-5" />
                    </Button>
                </div>
            </CardContent>
        </Card>
    )
}