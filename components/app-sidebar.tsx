import {
  Sidebar,
  SidebarContent,
  SidebarRail
} from "@/components/ui/sidebar"
import { Suspense } from "react"
import ChatWrapper from "./chat/chat-wrapper"


export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar {...props}>
      <SidebarContent>
        <Suspense fallback={
          <div>
            Loading...
          </div>
        }>
          <ChatWrapper />
        </Suspense>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}
