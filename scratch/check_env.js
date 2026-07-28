console.log('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
console.log('SUPABASE_SERVICE_ROLE_KEY exists:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.log('Length:', process.env.SUPABASE_SERVICE_ROLE_KEY.length);
  console.log('First 20 chars:', process.env.SUPABASE_SERVICE_ROLE_KEY.slice(0, 20));
}
