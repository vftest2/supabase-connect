import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify the caller is authenticated
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create client with caller's token to verify permissions
    const callerClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: caller }, error: callerError } = await callerClient.auth.getUser();
    if (callerError || !caller) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use service role to check if caller is super_admin or entity_admin
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: callerRoles } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id);

    const isSuperAdmin = callerRoles?.some((r: any) => r.role === "super_admin");
    const isEntityAdmin = callerRoles?.some((r: any) => r.role === "entity_admin");

    if (!isSuperAdmin && !isEntityAdmin) {
      return new Response(JSON.stringify({ error: "Sem permissão para criar usuários" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { email, password, full_name, entity_id, role, phone, position } = body;

    if (!email || !password || !full_name || !entity_id || !role) {
      return new Response(JSON.stringify({ error: "Campos obrigatórios faltando" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If entity_admin, verify they belong to the target entity
    if (isEntityAdmin && !isSuperAdmin) {
      const { data: callerProfile } = await adminClient
        .from("profiles")
        .select("entity_id")
        .eq("id", caller.id)
        .single();

      if (callerProfile?.entity_id !== entity_id) {
        return new Response(JSON.stringify({ error: "Sem permissão para esta entidade" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Create user with service role (won't affect caller's session)
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name,
        entity_id,
        phone: phone || null,
        position: position || null,
      },
    });

    if (authError) {
      let message = authError.message;
      if (message.includes("already been registered")) {
        message = "Este email já está cadastrado.";
      }
      return new Response(JSON.stringify({ error: message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const newUserId = authData.user.id;

    // The trigger handle_new_user creates profile + default 'user' role
    // Wait a moment for trigger to complete
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Update the role to the requested one (delete default 'user' role, insert correct one)
    await adminClient.from("user_roles").delete().eq("user_id", newUserId).eq("entity_id", entity_id);

    const { error: roleError } = await adminClient.from("user_roles").insert({
      user_id: newUserId,
      entity_id,
      role,
    });

    if (roleError) {
      console.error("Role creation error:", roleError);
    }

    return new Response(
      JSON.stringify({ user: { id: newUserId, email: authData.user.email } }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: "Erro interno do servidor" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
