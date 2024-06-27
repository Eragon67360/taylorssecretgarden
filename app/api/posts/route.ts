import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/service/supabaseClient";
import { auth, currentUser } from "@clerk/nextjs/server";

export async function GET() {
  const { data: posts, error } = await supabase
    .from("posts")
    .select(
      `
    id,
      content,
      likes,
      reports,
      created_at,
      user_id,
      users (
        id,
        username,
        firstName,
        lastName,
        avatar
      )
    `
    )
    .order("date", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(posts);
}

export async function POST(request: NextRequest) {
  const { content } = await request.json();

  try {
    const { userId } = auth();
    const user = await currentUser();
    const id = user?.id;

    const { error } = await supabase
      .from("posts")
      .insert([{ content, user_id: id }]);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(
      { message: "Post created successfully" },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json({ error: error }, { status: 500 });
  }
}
