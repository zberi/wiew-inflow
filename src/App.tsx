import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Media from "./pages/Media";
import Queue from "./pages/Queue";
import Destinations from "./pages/Destinations";
import Groups from "./pages/Groups";
import Logs from "./pages/Logs";
import Diagnostics from "./pages/Diagnostics";
import Settings from "./pages/Settings";
import WhatsAppEvents from "./pages/WhatsAppEvents";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/media" element={<Media />} />
          <Route path="/queue" element={<Queue />} />
          <Route path="/destinations" element={<Destinations />} />
          <Route path="/groups" element={<Groups />} />
          <Route path="/logs" element={<Logs />} />
          <Route path="/whatsapp-events" element={<WhatsAppEvents />} />
          <Route path="/diagnostics" element={<Diagnostics />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;