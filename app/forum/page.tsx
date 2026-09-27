"use client"
import React, { useEffect, useMemo, useState } from "react";
import { Avatar, Card, CardBody, CardFooter, CardHeader, Divider } from "@nextui-org/react";
import { toast } from "sonner";
import { Show, SignInButton, SignOutButton, SignUpButton, useClerk, UserButton } from "@clerk/nextjs";
import dynamic from "next/dynamic";
import 'react-quill-new/dist/quill.bubble.css';
import PostContent from "@/components/ui/PostContent";

interface Post {
  id: number;
  date: string;
  user_id: string;
  content: string;
  likes: number;
  reports: number;
  created_at: string;
}

interface User {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  created_at: string;
  avatar: string;
}

type UserProfile = {
  full_name: string;
  pseudonym: string;
};

export default function ForumPage() {

  const [users, setUsers] = useState<User[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [modalClosed, setModalClosed] = useState<boolean>(false);

  const ReactQuill = useMemo(() => dynamic(() => import('react-quill-new'), { ssr: false }), []);

  const { signOut } = useClerk();

  async function fetchUsers() {
    const response = await fetch('/api/users');
    const data = await response.json();
    if (response.ok) {
      setUsers(data);
    } else {
      console.error('Error fetching users:', data.error);
    }
  }

  async function signOutOfSession() {
    const response = await signOut({ redirectUrl: '/forum' });
    if (response !== null) {
      fetchProfile();
    }
  }

  const fetchProfile = async () => {
    setProfile(null);
    const response = await fetch('/api/user');
    const data = await response.json();
    if (data) {
      setProfile(data.user);
    } else {
      setProfile(null);
      console.error('Error fetching profile:', data.error);
    }
  };

  async function fetchPosts() {
    const response = await fetch('/api/posts');
    const data = await response.json();
    setPosts(data);
  }

  useEffect(() => {
    fetchProfile();
    fetchUsers();
    fetchPosts();
  }, [modalClosed]);

  const [content, setContent] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const response = await fetch('/api/posts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content }),
    });

    if (!response.ok) {
      console.error('Error creating post:', await response.json());
      toast.error('Error creating post:')
    } else {
      toast.success('Post created successfully!');
      setContent('');
      fetchPosts();
    }
  };


  return (
    <>
      <div className="w-full flex flex-col items-center">
        <div className="w-full h-[156px] bg-gradient-to-r from-[#7A2E3A] to-[#4C3337] flex flex-col items-center justify-center text-white px-4">
          <h1 className="text-xl text-center font-inter font-bold">Welcome to the swift<span className="text-[#F00]">ter</span></h1>
          <p className=" text-center text-[10px] mt-1">A social media made by swifties to talk about Taylor Swift for swifties</p>
        </div>

        <div className="w-full lg:max-w-[1180px] flex flex-col lg:flex-row gap-5 mt-8 px-4 lg:px-0">
          <div className="flex flex-col w-full lg:max-w-[280px]">
            <div className="w-full rounded-2xl bg-[#D9D9D9] flex items-center justify-between gap-2 p-[18px] text-black">
              <div className="flex gap-2">
                {profile ? (<UserButton />) : (<Avatar className="bg-white" size="sm" />)}

                <div className="flex flex-col text-[10px]">
                  <p>{profile ? `${profile.firstName} ${profile.lastName}` : 'Disconnected'}</p>
                  <p>@{profile ? profile.username : 'disconnected'}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <div className="flex flex-col gap-2">
                  <Show when="signed-out">
                    <SignUpButton>
                      <button className="bg-primary hover:bg-primary/50 text-white text-xs px-3 py-1 rounded-full transition-all duration-200">
                        Sign up
                      </button>
                    </SignUpButton>
                    <SignInButton>
                      <button className="bg-[#CDC9C0] text-xs px-3 py-1 rounded-full transition-all duration-200">
                        Log in
                      </button>
                    </SignInButton>
                  </Show>
                  <Show when="signed-in">
                    <button onClick={() => signOutOfSession()} className="bg-[#CDC9C0] text-xs px-3 py-1 rounded-full transition-all duration-200">
                      Sign out
                    </button>
                  </Show>
                </div>
              </div>

            </div>
          </div>

          <div className="flex flex-col gap-5 w-full lg:max-w-[480px]">
            <form
              onSubmit={handleSubmit}
              className="w-full rounded-2xl bg-[#D9D9D9] flex flex-col items-center gap-2 p-[18px] text-black py-4">

              <ReactQuill
                value={content}
                onChange={setContent}
                className="p-2 rounded-lg w-full mb-8"
                placeholder="What's on your mind?"
                theme="bubble"
                readOnly={profile ? false : true}
              />
              <div className="w-full flex justify-end">
                <button type="submit" color="primary" disabled={profile ? false : true} className="rounded-full bg-primary hover:bg-primary/50 disabled:bg-gray-400 text-white px-3 py-1 transition-all duration-200">POST</button>
              </div>
            </form>

            <div className="flex flex-col gap-2">
              {posts.map((post) => (
                <Card key={post.id}>
                  <CardHeader className="gap-5">
                    <Avatar isBordered radius="full" size="md" src={post.users.avatar} />
                    <div className="flex flex-col gap-1 items-start justify-center">
                      <h4 className="text-small font-semibold leading-none text-default-600">{`${post.users.firstName} ${post.users.lastName}`}</h4>
                      <h5 className="text-small tracking-tight text-default-400">@{post.users.username}</h5>
                    </div>
                  </CardHeader>

                  <Divider />
                  <CardBody>
                    <PostContent content={post.content} />
                  </CardBody>
                  <Divider />
                  <CardFooter>
                    <p>Posted on {new Date(post.date).toLocaleString()}</p>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-5 w-full lg:max-w-[380px]">
            <div className="w-full rounded-2xl bg-[#D9D9D9] flex items-center gap-2 py-[18px] px-4 text-black flex-col">
              <h2 className="text-xl font-bold">Current users</h2>
              <div className="flex flex-col gap-4 w-full">
                {users.map((user, index) => (
                  <div key={index} className="border-b border-black py-4 flex gap-2 justify-start items-center">
                    <Avatar src={user.avatar} />
                    <div className="flex flex-col">
                      <p>{user.firstName}&nbsp;{user.lastName}</p>
                      <p>@{user.username}</p>
                      <small>Joined on {new Date(user.created_at).toLocaleString()}</small>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

    </>
  );
}
