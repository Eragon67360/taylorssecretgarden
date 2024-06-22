// app/api/auth/signup/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/service/supabaseClient';

export async function POST(request: NextRequest) {
  const { email, password, full_name, pseudonym } = await request.json();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { user } = data;

  if (user) {
    const { error: profileError } = await supabase
      .from('profiles')
      .insert([
        { id: user.id, full_name, pseudonym }
      ]);

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }
  }

  return NextResponse.json({ message: 'User created successfully' });
}
