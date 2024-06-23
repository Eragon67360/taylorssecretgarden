// app/api/users/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/service/supabaseClient";

export async function GET() {
  const { data: users, error } = await supabase.from('users').select('*');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(users);
}

export async function POST(req:NextRequest) {
  const { user } = await req.json();

  const { error } = await supabase
        .from('users')
        .insert([
            { id: user.id, firstName: user.firstName, lastName:user.lastName, username: user.username }
        ]);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'Post created successfully' });

}
