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
    const CLICKSIGN_API_KEY = Deno.env.get('CLICKSIGN_API_KEY');
    if (!CLICKSIGN_API_KEY) {
      return new Response(JSON.stringify({ error: 'Clicksign API key not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { action, contract_id, document_name, signer_name, signer_email, signer_phone } = await req.json();

    if (action === 'create_and_send') {
      // 1. Create document in Clicksign
      const docRes = await fetch('https://app.clicksign.com/api/v1/documents?access_token=' + CLICKSIGN_API_KEY, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          document: {
            path: `/${document_name}.pdf`,
            content_base64: 'JVBERi0xLjQKMSAwIG9iago8PAovVGl0bGUgKENvbnRyYXRvKQo+PgplbmRvYmoKdHJhaWxlcgo8PAovUm9vdCAxIDAgUgo+PgolJUVPRg==',
            deadline_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            auto_close: true,
            locale: 'pt-BR',
            sequence_enabled: false,
          }
        }),
      });
      const docData = await docRes.json();
      const documentKey = docData?.document?.key;

      if (!documentKey) {
        return new Response(JSON.stringify({ error: 'Failed to create document', details: docData }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // 2. Add signer
      const signerRes = await fetch('https://app.clicksign.com/api/v1/signers?access_token=' + CLICKSIGN_API_KEY, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signer: {
            email: signer_email,
            phone_number: signer_phone,
            name: signer_name,
            auths: ['whatsapp'],
            delivery: 'whatsapp',
          }
        }),
      });
      const signerData = await signerRes.json();
      const signerKey = signerData?.signer?.key;

      if (!signerKey) {
        return new Response(JSON.stringify({ error: 'Failed to create signer', details: signerData }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // 3. Add signer to document
      await fetch('https://app.clicksign.com/api/v1/lists?access_token=' + CLICKSIGN_API_KEY, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          list: {
            document_key: documentKey,
            signer_key: signerKey,
            sign_as: 'sign',
          }
        }),
      });

      // 4. Send notification via WhatsApp
      await fetch(`https://app.clicksign.com/api/v1/notifications?access_token=${CLICKSIGN_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          request_signature_key: signerKey,
          message: `Olá ${signer_name}, segue o contrato para assinatura.`,
        }),
      });

      // 5. Update contract in database
      await supabase.from('contracts').update({
        clicksign_document_key: documentKey,
        clicksign_signer_key: signerKey,
        status: 'sent',
        whatsapp_sent: true,
        whatsapp_sent_at: new Date().toISOString(),
      }).eq('id', contract_id);

      return new Response(JSON.stringify({ success: true, document_key: documentKey, signer_key: signerKey }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
