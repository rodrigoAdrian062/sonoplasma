import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { AudioPlayerProvider } from "@/contexts/AudioPlayerContext";
import { BackgroundMusicProvider } from "@/contexts/BackgroundMusicContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Loader2 } from "lucide-react";
import Index from "./pages/Index";
import SectionDetail from "./pages/SectionDetail";
import Auth from "./pages/Auth";

// Páginas pesadas/menos usadas — carregadas sob demanda para reduzir o bundle inicial
const AudioLibrary = lazy(() => import("./pages/AudioLibrary"));
const SpotifyLibrary = lazy(() => import("./pages/SpotifyLibrary"));
const YoutubeLibrary = lazy(() => import("./pages/YoutubeLibrary"));
const NotFound = lazy(() => import("./pages/NotFound"));
const UserManagement = lazy(() => import("./pages/UserManagement"));
const RoteiroPage = lazy(() => import("./pages/RoteiroPage"));
const RoteirosLibrary = lazy(() => import("./pages/RoteirosLibrary"));

import { MiniPlayer } from "@/components/MiniPlayer";
import { QuickNav } from "@/components/QuickNav";
import { FloatingBackgroundMusic } from "@/components/FloatingBackgroundMusic";

// Dados de cerimônia/áudio são majoritariamente estáticos entre navegações.
// Evita refetch em cada mount / focus da aba.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const RouteFallback = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <Loader2 className="w-8 h-8 text-gold animate-spin" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AudioPlayerProvider>
          <BackgroundMusicProvider>
          
          
          <Suspense fallback={<RouteFallback />}>
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
            <Route
              path="/roteiro/:sectionId"
              element={
                <ProtectedRoute>
                  <RoteiroPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/roteiros"
              element={
                <ProtectedRoute>
                  <RoteirosLibrary />
                </ProtectedRoute>
              }
            />

            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          </Suspense>
          <MiniPlayer />
          <QuickNav />
          <FloatingBackgroundMusic />
          </BackgroundMusicProvider>
          </AudioPlayerProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
