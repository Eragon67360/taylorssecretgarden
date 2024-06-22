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
    const { content } = await request.json();

    const { data: { user } } = await supabase.auth.getUser()
    console.log(user)
    if (user?.aud !== "authenticated") {
        return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const response = await fetch('/api/profile?id=' + user?.id);
    const data = await response.json();

    const uuid: string = user.id;

    const { error } = await supabase
        .from('posts')
        .insert([
            { content, user_id: uuid, name: data.full_name, pseudonym: data.pseudonym }
        ]);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'Post created successfully' });
}
