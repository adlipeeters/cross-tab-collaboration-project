import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { User } from "@/types"



export function UserSidebar({ users }: { users: User[] | null }) {
  const getStatusColor = (status: User["active"]) => {
    switch (status) {
      case true:
        return "bg-green-500"
      case false:
        return "bg-red-500"
      default:
        return "bg-gray-400"
    }
  }

  return (
    <div className="w-80 bg-card/40 backdrop-blur-sm border-r border-border/50 flex flex-col">
      <div className="p-4 border-b border-border/50">
        <h2 className="text-lg font-semibold text-foreground">Messages</h2>
      </div>

      <div className="flex-1 overflow-y-auto">
        {users?.map((user) => (
          <div key={user.id}>
            {user.active && (
              <div
                className="flex items-center gap-3 p-4 hover:bg-muted/50 cursor-pointer transition-colors border-b border-border/20"
              >
                <div className="relative">
                  <Avatar className="w-12 h-12">
                    <AvatarFallback className="bg-muted text-muted-foreground">{user.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div
                    className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-card ${getStatusColor(
                      user.active,
                    )}`}
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-foreground truncate">{user.name}</h3>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
