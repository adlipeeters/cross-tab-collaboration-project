import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Settings, Search } from "lucide-react"
import { User } from "@/types"
import { ModeToggle } from "@/components/mode-toggle"

export function Navbar({ currentUser }: { currentUser: User | null }) {
  return (
    <div className="flex items-center justify-between p-4 bg-card/60 backdrop-blur-sm border-b border-border/50">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-accent rounded-full"></div>
          <span className="text-lg font-semibold text-foreground">Chat App</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* <Button variant="ghost" size="icon" className="rounded-xl">
          <Search className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="icon" className="rounded-xl">
          <Settings className="w-4 h-4" />
        </Button> */}
        <ModeToggle />
        <Avatar className="w-8 h-8">
          <AvatarFallback className="bg-primary text-primary-foreground text-xs">{currentUser?.name.charAt(0)}</AvatarFallback>
        </Avatar>
      </div>
    </div>
  )
}
