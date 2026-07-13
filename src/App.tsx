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
import YoutubeLibrary from "./pages/YoutubeLibrary";
import NotFound from "./pages/NotFound";
import UserManagement from "./pages/UserManagement";
import { MiniPlayer } from "@/components/MiniPlayer";
import { QuickNav } from "@/components/QuickNav";
import { FocusModeProvider } from "@/contexts/FocusModeContext";
import { FocusModeToggle } from "@/components/FocusModeToggle";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AudioPlayerProvider>
          <FocusModeProvider>
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
            <Route 
              path="/spotify" 
              element={
                <ProtectedRoute>
                  <SpotifyLibrary />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/youtube" 
              element={
                <ProtectedRoute>
                  <YoutubeLibrary />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/usuarios" 
              element={
                <ProtectedRoute>
                  <UserManagement />
                </ProtectedRoute>
              } 
            />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          <MiniPlayer />
          <QuickNav />
          </AudioPlayerProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
