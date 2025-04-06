import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

// Gebruik environment variable voor de frontend origin, met fallback voor lokaal
const MAIN_APP_ORIGIN = process.env.NEXT_PUBLIC_MAIN_APP_URL || 'http://localhost:3001'; // Fallback voor lokaal

export async function GET(request: Request) {
  const supabase = createRouteHandlerClient({ cookies })
  const headers = new Headers()

  // --- CORS Headers ---
  headers.set('Access-Control-Allow-Origin', MAIN_APP_ORIGIN) // Gebruik variabele
  headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS')
  headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  headers.set('Access-Control-Allow-Credentials', 'true')

  try {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      // Geen ingelogde gebruiker in de admin-app sessie
      return NextResponse.json({ isAdmin: false }, { status: 401, headers }) // Unauthorized
    }

    // --- Admin Check Logica (Gebaseerd op jouw admin_users tabel) ---
    const { data: adminEntry, error: adminCheckError } = await supabase
      .from('admin_users') // Jouw tabelnaam
      .select('id')        // We hebben alleen nodig om te weten of het bestaat
      .eq('id', user.id) // Controleer op basis van de gebruikers ID
      .maybeSingle()       // Verwacht 0 of 1 resultaat

    if (adminCheckError) {
      console.error('Error checking admin_users table:', adminCheckError)
      // Stuur geen admin status bij een database fout
      return NextResponse.json({ isAdmin: false }, { status: 500, headers })
    }

    // Als adminEntry niet null is, bestaat de gebruiker in de admin tabel
    const isAdmin = adminEntry !== null
    // --- Einde Admin Check Logica ---


    // Stuur het resultaat
    return NextResponse.json({ isAdmin: isAdmin }, { status: 200, headers })

  } catch (error) {
    console.error('API Error checking admin status:', error)
    // Algemene serverfout
    const errorHeaders = new Headers(headers) // Kopieer CORS headers
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500, headers: errorHeaders })
  }
}

// --- OPTIONS Request Handler (Nodig voor preflight requests met credentials) ---
export async function OPTIONS(request: Request) {
  const headers = new Headers()
  headers.set('Access-Control-Allow-Origin', MAIN_APP_ORIGIN); // Gebruik variabele
  headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  headers.set('Access-Control-Allow-Credentials', 'true');
  return new NextResponse(null, { status: 204, headers }); // No Content
} 