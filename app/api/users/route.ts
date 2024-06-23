// app/api/users/route.ts
import { NextResponse } from "next/server";
import { supabase } from "@/service/supabaseClient";

export async function GET() {
  const { data: users, error } = await supabase.from('users').select('*');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(users);
}
