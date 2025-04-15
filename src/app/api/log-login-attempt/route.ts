import { createClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'

// --- Rate Limiter Setup (In-Memory) ---
const attempts = new Map<string, { count: number; firstAttempt: number }>();
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minuut
const RATE_LIMIT_MAX_ATTEMPTS = 10; // Max 10 logpogingen per IP per minuut
// ---------------------------------------

// BELANGRIJK: Zorg dat deze environment variables correct zijn ingesteld in je .env.local (en Vercel/hosting)!
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY // NIET public!

// Controleer of de variabelen bestaan
if (!supabaseUrl || !serviceRoleKey) {
  console.error("[API log-login-attempt] Supabase URL or Service Role Key is missing in environment variables.");
  // Overweeg hier een harde fout of een fallback, afhankelijk van je beleid
}

// Maak een Supabase client aan die RLS omzeilt (ALLEEN voor server-side gebruik!)
// Pas op met het blootstellen van deze client of de service_role key.
const supabaseAdmin = createClient(supabaseUrl!, serviceRoleKey!, {
  auth: {
    // Belangrijk: Voorkom dat deze client gebruikersessies beheert
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false
  }
});

export async function POST(request: NextRequest) {
  console.log('[API log-login-attempt] Received request'); // LOG 6: Wordt de route geraakt?

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || request.ip || 'unknown-ip';
  console.log('[API log-login-attempt] Source IP for rate limit:', ip);

  // --- Rate Limiter Check ---
  const now = Date.now();
  const ipData = attempts.get(ip);

  if (ipData && (now - ipData.firstAttempt) < RATE_LIMIT_WINDOW_MS) {
    // Within window
    if (ipData.count >= RATE_LIMIT_MAX_ATTEMPTS) {
      console.warn(`[API log-login-attempt] Rate limit exceeded for IP: ${ip}`);
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }
    // Increment count
    attempts.set(ip, { ...ipData, count: ipData.count + 1 });
  } else {
    // Outside window or first attempt
    attempts.set(ip, { count: 1, firstAttempt: now });
    // Optional: Clean up old entries periodically (not implemented here for simplicity)
  }
  // -------------------------

  try {
    const body = await request.json();
    console.log('[API log-login-attempt] Request body:', body); // LOG 7: Wat zit er in de body?
    const { email_attempted, is_successful, failure_reason, user_id } = body;

    // Haal IP en User Agent op (betrouwbaarder op de server)
    // Let op: X-Forwarded-For kan gespoofed worden, maar is vaak de beste gok in productie.
    const user_agent = request.headers.get('user-agent');
    console.log('[API log-login-attempt] IP:', ip, 'User Agent:', user_agent ? 'Present' : 'Missing'); // LOG 8: IP/UA Check

    // Valideer de ontvangen data (basis check)
    if (!email_attempted || typeof is_successful !== 'boolean') {
      console.error('[API log-login-attempt] Validation failed: Missing required fields.');
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    console.log('[API log-login-attempt] Attempting to insert into Supabase...'); // LOG 9: Voor de insert
    const insertData = {
        email_attempted,
        is_successful,
        failure_reason: failure_reason || null, // Zorg dat het null is als het niet meegegeven wordt
        user_id: user_id || null, // Zorg dat het null is als het niet meegegeven wordt (bijv. bij falen)
        ip_address: ip,
        user_agent
    };
    console.log('[API log-login-attempt] Data to insert:', insertData); // LOG 10: Welke data wordt verstuurd?

    const { error: insertError } = await supabaseAdmin
      .from('login_attempts')
      .insert(insertData);

    if (insertError) {
      console.error('[API log-login-attempt] Supabase insert error:', insertError); // LOG 11: Supabase Error
      throw insertError;
    }

    console.log('[API log-login-attempt] Supabase insert successful.'); // LOG 12: Supabase Succes
    // Stuur een succesvol antwoord (geen data nodig, alleen bevestiging)
    return NextResponse.json({ success: true }, { status: 200 });

  } catch (error: any) {
    console.error('[API log-login-attempt] General catch error:', error); // LOG 13: Algemene fout
    // Stuur een generieke server error terug naar de client
    return NextResponse.json({ error: error.message || 'Failed to log login attempt' }, { status: 500 });
  }
} 