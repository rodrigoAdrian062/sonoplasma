// Edge function: parse PDF or DOCX uploads and return plain paragraphs
import { extractText, getDocumentProxy } from "https://esm.sh/unpdf@0.11.0";
import mammoth from "https://esm.sh/mammoth@1.8.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const form = await req.formData();
    const file = form.get('file');
    if (!(file instanceof File)) return json({ error: 'Arquivo não enviado' }, 400);

    const name = file.name.toLowerCase();
    const buf = new Uint8Array(await file.arrayBuffer());
    let text = '';

    if (name.endsWith('.pdf')) {
      const pdf = await getDocumentProxy(buf);
      const { text: t } = await extractText(pdf, { mergePages: true });
      text = Array.isArray(t) ? t.join('\n') : String(t || '');
    } else if (name.endsWith('.docx')) {
      const res = await mammoth.extractRawText({ arrayBuffer: buf.buffer });
      text = res.value || '';
    } else if (name.endsWith('.txt') || name.endsWith('.md')) {
      text = new TextDecoder().decode(buf);
    } else {
      return json({ error: 'Formato não suportado. Envie PDF, DOCX ou TXT.' }, 400);
    }

    // Normalize: strip weird control chars, collapse spaces, keep paragraph breaks
    const cleaned = text
      .replace(/\r/g, '\n')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    return json({ text: cleaned });
  } catch (e: any) {
    console.error('parse-roteiro error:', e);
    return json({ error: e?.message || 'Falha ao processar arquivo' }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
