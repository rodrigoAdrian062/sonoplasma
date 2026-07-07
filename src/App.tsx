import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { AudioPlayerProvider } from "@/contexts/AudioPlayerContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import SectionDetail from "./pages/SectionDetail";
import Auth from "./pages/Auth";

import AudioLibrary from "./pages/AudioLibrary";
import SpotifyLibrary from "./pages/SpotifyLibrary";
import NotFound from "./pages/NotFound";
import { MiniPlayer } from "@/components/MiniPlayer";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AudioPlayerProvider>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route 
              path="/" 
              element={
                <ProtectedRoute>
                  <Index />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/secao/:sectionId" 
              element={
                <ProtectedRoute>
                  <SectionDetail />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/biblioteca" 
              element={
                <ProtectedRoute>
                  <AudioLibrary />
                </ProtectedRoute>
              } 
            />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          <MiniPlayer />
          </AudioPlayerProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
