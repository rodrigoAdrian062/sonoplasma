import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { AudioPlayerProvider } from "@/contexts/AudioPlayerContext";
import { BackgroundMusicProvider } from "@/contexts/BackgroundMusicContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Loader2 } from "lucide-react";
import Index from "./pages/Index";
import SectionDetail from "./pages/SectionDetail";
import Auth from "./pages/Auth";

// Páginas pesadas/menos usadas — carregadas sob demanda para reduzir o bundle inicial
const AudioLibrary = lazy(() => import("./pages/AudioLibrary"));
const YoutubeLibrary = lazy(() => import("./pages/YoutubeLibrary"));

const NotFound = lazy(() => import("./pages/NotFound"));
const UserManagement = lazy(() => import("./pages/UserManagement"));
const Acervo = lazy(() => import("./pages/Acervo"));



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
      // 2 retentativas com backoff exponencial (máx 5s), pulando erros
      // de autenticação/permissão que não vão se resolver com retry.
      retry: (failureCount, error: unknown) => {
        if (failureCount >= 2) return false;
        const msg = (error instanceof Error ? error.message : String(error || "")).toLowerCase();
        if (msg.includes("jwt") || msg.includes("unauthorized") || msg.includes("permission") || msg.includes("policy")) return false;
        return true;
      },
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 5000),
    },
    mutations: {
      retry: 1,
      retryDelay: 500,
    },
  },
});

const persister = createSyncStoragePersister({
  storage: window.localStorage,
  key: "SONOPLASMA_QUERY_CACHE",
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
          <ErrorBoundary context="routes">
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route 
              path="/" 
              element={
                <ProtectedRoute>
                  <ErrorBoundary context="Index"><Index /></ErrorBoundary>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/secao/:sectionId" 
              element={
                <ProtectedRoute>
                  <ErrorBoundary context="SectionDetail"><SectionDetail /></ErrorBoundary>
                </ProtectedRoute>
              } 
            />
            
            
            <Route 
              path="/biblioteca" 
              element={
                <ProtectedRoute>
                  <ErrorBoundary context="AudioLibrary"><AudioLibrary /></ErrorBoundary>
                </ProtectedRoute>
              } 
            />
            

            <Route 
              path="/youtube" 
              element={
                <ProtectedRoute>
                  <ErrorBoundary context="YoutubeLibrary"><YoutubeLibrary /></ErrorBoundary>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/usuarios" 
              element={
                <ProtectedRoute>
                  <ErrorBoundary context="UserManagement"><UserManagement /></ErrorBoundary>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/acervo" 
              element={
                <ProtectedRoute>
                  <ErrorBoundary context="Acervo"><Acervo /></ErrorBoundary>
                </ProtectedRoute>
              } 
            />


            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          </ErrorBoundary>
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
