import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { MessageSquare } from "lucide-react";

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <header className="h-14 border-b bg-card/80 backdrop-blur-sm flex items-center px-4 gap-4 sticky top-0 z-10">
            <SidebarTrigger />
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg gradient-primary flex items-center justify-center shadow-md glow-primary">
                <MessageSquare className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-semibold text-lg gradient-text">WhatsApp Media Hub</span>
            </div>
            <div className="flex-1" />
            <ThemeToggle />
          </header>
          <main className="flex-1 overflow-auto p-6 bg-background">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}