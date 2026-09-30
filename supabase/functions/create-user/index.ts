import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ============================================================
// CORS
// ============================================================

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

// ============================================================
// FUNÇÃO PRINCIPAL
// ============================================================

Deno.serve(async (req) => {
  // ----------------------------------------------------------
  // 1. TRATAMENTO DO PREFLIGHT CORS
  // ----------------------------------------------------------

  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  // ----------------------------------------------------------
  // 2. ACEITAR SOMENTE POST
  // ----------------------------------------------------------

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({
        success: false,
        error: "Método não permitido. Use POST.",
      }),
      {
        status: 405,
        headers: {
          ...corsHeaders,
          Allow: "POST, OPTIONS",
        },
      },
    );
  }

  try {
    // --------------------------------------------------------
    // 3. VARIÁVEIS DO SUPABASE
    // --------------------------------------------------------

    const supabaseUrl = Deno.env.get("SUPABASE_URL");

    const serviceRoleKey =
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl) {
      throw new Error(
        "SUPABASE_URL não está configurada na Edge Function.",
      );
    }

    if (!serviceRoleKey) {
      throw new Error(
        "SUPABASE_SERVICE_ROLE_KEY não está configurada na Edge Function.",
      );
    }

    // --------------------------------------------------------
    // 4. CLIENTE ADMINISTRATIVO
    // --------------------------------------------------------

    const supabaseAdmin = createClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );

    // --------------------------------------------------------
    // 5. LER DADOS ENVIADOS PELO FRONTEND
    // --------------------------------------------------------

    const body = await req.json();

    const username =
      typeof body.username === "string"
        ? body.username.trim()
        : "";

    const password =
      typeof body.password === "string"
        ? body.password
        : "";

    const email =
      typeof body.email === "string"
        ? body.email.trim().toLowerCase()
        : "";

    // --------------------------------------------------------
    // 6. VALIDAR USUÁRIO
    // --------------------------------------------------------

    if (!username) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "O usuário é obrigatório.",
        }),
        {
          status: 400,
          headers: corsHeaders,
        },
      );
    }

    // --------------------------------------------------------
    // 7. VALIDAR SENHA
    // --------------------------------------------------------

    if (!password) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "A senha é obrigatória.",
        }),
        {
          status: 400,
          headers: corsHeaders,
        },
      );
    }

    if (password.length < 6) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "A senha precisa ter pelo menos 6 caracteres.",
        }),
        {
          status: 400,
          headers: corsHeaders,
        },
      );
    }

    // --------------------------------------------------------
    // 8. DEFINIR EMAIL
    //
    // Se o seu frontend já envia email, utiliza o email.
    //
    // Se envia somente "username", criamos um email interno.
    // Isso permite utilizar o Supabase Auth mesmo quando a tela
    // trabalha com "usuário".
    // --------------------------------------------------------

    const userEmail =
      email ||
      `${username.toLowerCase().replace(/[^a-z0-9._-]/g, "")}@usuarios.local`;

    // --------------------------------------------------------
    // 9. VERIFICAR SE JÁ EXISTE
    // --------------------------------------------------------

    const { data: existingUsers, error: listError } =
      await supabaseAdmin.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      });

    if (listError) {
      console.error("Erro ao consultar usuários:", listError);

      return new Response(
        JSON.stringify({
          success: false,
          error: "Não foi possível verificar os usuários existentes.",
          details: listError.message,
        }),
        {
          status: 500,
          headers: corsHeaders,
        },
      );
    }

    const usernameExists = existingUsers.users.some(
      (user) =>
        user.user_metadata?.username?.toLowerCase() ===
        username.toLowerCase(),
    );

    if (usernameExists) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Este usuário já existe.",
        }),
        {
          status: 409,
          headers: corsHeaders,
        },
      );
    }

    // --------------------------------------------------------
    // 10. CRIAR USUÁRIO NO SUPABASE AUTH
    // --------------------------------------------------------

    const { data, error } =
      await supabaseAdmin.auth.admin.createUser({
        email: userEmail,
        password: password,
        email_confirm: true,

        user_metadata: {
          username: username,
        },
      });

    // --------------------------------------------------------
    // 11. TRATAR ERRO DO SUPABASE
    // --------------------------------------------------------

    if (error) {
      console.error("Erro ao criar usuário:", error);

      return new Response(
        JSON.stringify({
          success: false,
          error: error.message,
        }),
        {
          status: 400,
          headers: corsHeaders,
        },
      );
    }

    // --------------------------------------------------------
    // 12. VERIFICAR SE USUÁRIO FOI CRIADO
    // --------------------------------------------------------

    if (!data.user) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "O usuário não foi criado.",
        }),
        {
          status: 500,
          headers: corsHeaders,
        },
      );
    }

    // --------------------------------------------------------
    // 13. GARANTIR PERFIL PADRÃO COM PLANO GRATUITO
    // --------------------------------------------------------

    const defaultPermissions = {
      canCreateUnlimitedSections: false,
      canCreateUnlimitedStages: false,
      canUsePremiumLibrary: false,
      canUploadAudio: false,
      canUseBackup: false,
      canExportContent: false,
      canUseAI: false,
      canManageUsers: false,
      canManagePermissions: false,
      canUseAdvancedThemes: false,
      canUseAdvancedPresentation: false,
      canAccessEverything: false,
    };

    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .upsert(
        {
          user_id: data.user.id,
          username: username,
          plan: "free",
          permissions: defaultPermissions,
        },
        { onConflict: "user_id" },
      );

    if (profileError) {
      console.error("Erro ao criar perfil do usuário:", profileError);
      await supabaseAdmin.auth.admin.deleteUser(data.user.id);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Não foi possível salvar o perfil do acesso criado.",
        }),
        {
          status: 500,
          headers: corsHeaders,
        },
      );
    }

    // --------------------------------------------------------
    // 14. RESPOSTA DE SUCESSO
    // --------------------------------------------------------

    return new Response(
      JSON.stringify({
        success: true,
        message: "Acesso criado com sucesso.",
        user: {
          id: data.user.id,
          username: username,
          email: data.user.email,
        },
      }),
      {
        status: 200,
        headers: corsHeaders,
      },
    );
  } catch (error) {
    // --------------------------------------------------------
    // 14. ERRO GERAL
    // --------------------------------------------------------

    console.error("Erro interno:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Erro interno do servidor.",
      }),
      {
        status: 500,
        headers: corsHeaders,
      },
    );
  }
});
