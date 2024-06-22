'use server'
import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { createClient } from '@/service/supabase/server';

export async function POST(request: NextRequest) {
  const { email, password } = await request.json();
  const supabase = createClient()
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  // revalidatePath('/', 'layout')
  // redirect('/account')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ message: 'Logged in successfully', data });
}
