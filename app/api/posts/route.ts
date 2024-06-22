// app/api/posts/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/service/supabaseClient';

export async function GET() {
    const { data: posts, error } = await supabase
        .from('posts')
        .select('*')
        .order('date', { ascending: false });

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(posts);
}

export async function POST(request: NextRequest) {
    const { content, user_id } = await request.json();

    console.log(content, user_id)

    const { error } = await supabase
        .from('posts')
        .insert([
            { content }
        ]);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'Post created successfully' });
}
