import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const WEBHOOK_SECRET = Deno.env.get('CLICKSIGN_WEBHOOK_SECRET');
    
    const body = await req.json();
    const { event } = body;

    // Validate webhook secret if configured
    if (WEBHOOK_SECRET) {
      const signature = req.headers.get('x-clicksign-signature');
      if (!signature) {
        return new Response(JSON.stringify({ error: 'Missing signature' }), {
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    if (event?.name === 'close' || event?.name === 'sign') {
      const documentKey = event?.data?.document?.key;
      if (documentKey) {
        await supabase.from('contracts').update({
          status: 'signed',
          signed_at: new Date().toISOString(),
        }).eq('clicksign_document_key', documentKey);
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
