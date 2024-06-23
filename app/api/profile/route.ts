import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/service/supabaseClient";

export async function GET(request: NextRequest) {

  // const { data: { user } } = await supabase.auth.getUser()

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')


  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(profile);
}
