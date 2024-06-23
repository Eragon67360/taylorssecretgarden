"use client"
import React, { useEffect, useState } from "react";
import { Avatar, Textarea, Tabs, Tab, Card, CardBody, CardFooter, CardHeader, Modal, useDisclosure } from "@nextui-org/react";
import { supabase } from "@/service/supabaseClient";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import LoginModal from "@/components/auth/LoginModal";
import SignUpModal from "@/components/auth/SignUpModal";
import { SignedIn, SignedOut, SignInButton, SignOutButton, SignUpButton, UserButton } from "@clerk/nextjs";

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
  name: string;
  created_at: string;
}

type UserProfile = {
  full_name: string;
  pseudonym: string;
};

export default function ForumPage() {

  const [users, setUsers] = useState<User[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [authenticated, setAuthenticated] = useState<boolean>(false);
  const [modalClosed, setModalClosed] = useState<boolean>(false);

  const [userProfiles, setUserProfiles] = useState({});


  const modalLogin = useDisclosure();
  const modalSignUp = useDisclosure();

  async function retrieveSession() {
    const { data, error } = await supabase.auth.getSession();
    const { session } = data
    console.log(user);
    if (error) {
      console.error('Error fetching users:', error);
    } else {
      setUsers(users);
    }
  }

  useEffect(() => {
    async function fetchUsers() {
      const { data: users, error } = await supabase.from('users').select('*');
      if (error) {
        console.error('Error fetching users:', error);
      } else {
        setUsers(users);
      }
    }

    const fetchProfile = async () => {
      setProfile(null);
      const response = await fetch('/api/user');
      const data = await response.json();

      if (data) {
        setProfile(data.user);
        console.log(data.user);
      } else {
        console.error('Error fetching profile:', data.error);
      }
    };

    async function fetchPosts() {
      const response = await fetch('/api/posts');
      const data = await response.json();
      setPosts(data);
    }

    fetchProfile();
    if (modalClosed) {
      fetchProfile();
    }
    fetchUsers();
    fetchPosts();
  }, [modalClosed]);

  const [content, setContent] = useState('');
  const router = useRouter();

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
      console.log('Success')
      setContent('');
      router.push('/forum');
    }
  };

  const handleLogout = async () => {
    const response = await fetch('/api/auth/signout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      toast.error(`Error: ${error.error}`);
    } else {
      toast.success('Succesffuly signed out!');
    }
  };

  return (
    <>
      <div className="w-full flex flex-col items-center">
        <div className="w-full h-[156px] bg-gradient-to-r from-[#7A2E3A] to-[#4C3337] flex flex-col items-center justify-center text-white px-4">
          <h1 className="text-xl text-center font-inter font-bold">Welcome to the swift<span className="text-[#F00]">ter</span></h1>
          <p className=" text-center text-[10px] mt-1">A social media made by swifties to talk about Taylor Swift for swifties</p>
          <div className="mt-6 rounded-full w-full lg:w-[580px] h-7 bg-white px-[14px] py-2 text-[#6E6E6E] flex items-center">Search</div>
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
                  <SignedOut>
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
                  </SignedOut>
                  <SignedIn>
                    <SignOutButton redirectUrl="/forum">
                      <button className="bg-[#CDC9C0] text-xs px-3 py-1 rounded-full transition-all duration-200">
                        Sign out
                      </button>
                    </SignOutButton>
                  </SignedIn>
                </div>
              </div>

            </div>
          </div>

          <div className="flex flex-col gap-5 w-full lg:max-w-[480px]">
            <form
              onSubmit={handleSubmit}
              className="w-full rounded-2xl bg-[#D9D9D9] flex flex-col items-center gap-2 p-[18px] text-black py-4">
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="p-2 rounded-lg w-full"
                placeholder="What's on your mind?"
                required
                color="primary"
                variant="underlined" />
              <div className="w-full flex justify-end">
                <button type="submit" color="primary" disabled={profile ? false : true} className="rounded-full bg-primary hover:bg-primary/50 disabled:bg-gray-400 text-white px-3 py-1 transition-all duration-200">POST</button>
              </div>
            </form>

            <Tabs variant="underlined" aria-label="Tabs variants" >
              <Tab title="All" className="flex flex-col gap-2">
                {posts.map((post) => (
                  <Card key={post.id}>
                    <CardHeader className="gap-2">
                      <Avatar size="sm" />
                      <p className="font-bold uppercase">
                        {post.user_id}
                      </p>
                    </CardHeader>
                    <CardBody>
                      {post.content}
                      <div>Likes: {post.likes} | Reports: {post.reports}</div>
                    </CardBody>
                    <CardFooter>
                      <p>Posted on {new Date(post.date).toLocaleString()}</p>
                    </CardFooter>
                  </Card>
                ))}

              </Tab>
              <Tab title="Following">
                <Card>
                  <CardHeader className="gap-2">
                    <Avatar size="sm" />
                    <p className="font-bold uppercase">Name but following</p>
                  </CardHeader>
                  <CardBody>
                    This is a post, I follow the creator
                  </CardBody>
                  <CardFooter>
                    <p>Posted on 15. June 2024</p>
                  </CardFooter>
                </Card>
              </Tab>
            </Tabs>
          </div>
          <div className="flex flex-col gap-5 w-full lg:max-w-[380px]">
            <div className="w-full rounded-2xl bg-[#D9D9D9] flex items-center gap-2 p-[18px] text-black flex-col">
              <h2 className="text-xl font-bold">Current users</h2>
              <div className="flex flex-col gap-4">
                {users.map((user) => (
                  <div key={user.id} className="border-b py-4">
                    <p>{user.name}</p>
                    <small>Joined on {new Date(user.created_at).toLocaleString()}</small>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      <Modal
        isOpen={modalLogin.isOpen}
        onOpenChange={modalLogin.onOpenChange}
        placement="top-center"
        backdrop="blur">
        <LoginModal onClose={() => {
          modalLogin.onClose();
          retrieveSession();
          setModalClosed(true);
        }} />
      </Modal>

      <Modal
        isOpen={modalSignUp.isOpen}
        onOpenChange={modalSignUp.onOpenChange}
        placement="top-center"
        backdrop="blur">
        <SignUpModal />
      </Modal>

    </>
  );
}
