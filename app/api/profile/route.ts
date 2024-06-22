import { NextResponse } from 'next/server';
import { supabase } from '@/service/supabaseClient';

export async function GET() {

  const { data: { user } } = await supabase.auth.getUser()

  if (user?.aud !== "authenticated") {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(profile);
}
