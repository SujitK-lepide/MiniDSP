/**
 * Public Supabase settings. NEXT_PUBLIC_* values are inlined at build time, so after adding or
 * changing them on Vercel the project must be redeployed.
 */
export function supabaseEnv(): { url: string; anonKey: string } {
  // Literal property access is required for Next.js to inline NEXT_PUBLIC_* values.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  const problems: string[] = [];
  if (!url) problems.push('NEXT_PUBLIC_SUPABASE_URL is not set');
  else if (!/^https?:\/\/[^\s/]+/.test(url)) problems.push('NEXT_PUBLIC_SUPABASE_URL is not an http(s) URL');
  if (!anonKey) problems.push('NEXT_PUBLIC_SUPABASE_ANON_KEY is not set');

  if (problems.length > 0) {
    // Names only — never the values.
    throw new Error(
      `Supabase is not configured: ${problems.join('; ')}. ` +
        'Set both variables (in .env.local locally, or in Vercel → Settings → Environment Variables) and redeploy.',
    );
  }
  return { url: url!, anonKey: anonKey! };
}
