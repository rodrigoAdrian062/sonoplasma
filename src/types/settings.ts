export interface AppSettings {
  id: string;
  nome_app: string;
  subtitulo_app: string | null;
  logo_url: string | null;
  cor_tema: string | null;
  spotify_client_id: string | null;
  spotify_client_secret: string | null;
  created_at: string;
  updated_at: string;
}
