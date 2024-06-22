'use client'
import { Avatar, Button, Textarea, Tabs, Tab, Card, CardBody, CardFooter, CardHeader, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure } from "@nextui-org/react";

import { supabase } from "@/service/supabaseClient";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import LoginModal from "@/components/auth/LoginModal";
import SignUpModal from "@/components/auth/SignUpModal";

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

export default function ForumPage() {

  const [users, setUsers] = useState<User[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);

  const modalLogin = useDisclosure();
  const modalSignUp = useDisclosure();

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
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.aud === "authenticated") {
        setUser(user);
      }
      const response = await fetch('/api/profile');
      const data = await response.json();

      if (response.ok) {
        setProfile(data);
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
    fetchUsers();
    fetchPosts();
  }, []);

  const [content, setContent] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const user: User = {
      name: "Thomas",
      id: "123e4567-e89b-12d3-a456-426614174000",
      created_at: ""
    };
    // const user = supabase.auth.user();
    const user_id = '123e4567-e89b-12d3-a456-426614174000';

    if (!user) {
      toast.error('You must be logged in to create a post.');
      return;
    }

    const response = await fetch('/api/posts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content, user_id: user_id }),
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
    const { error } = await supabase.auth.signOut();
    if (!error) {
      setUser(null);
      setProfile(null);
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
                <Avatar className="bg-white" size="sm" />
                <div className="flex flex-col text-[10px]">
                  <p>{profile ? profile.full_name : 'Disconnected'}</p>
                  <p>@{profile ? profile.pseudonym : 'disconnected'}</p>
                </div>
              </div>
              <div className="flex gap-2">
                {!user ? (
                  <>
                    <button onClick={modalSignUp.onOpen} className="bg-[#CDC9C0] text-xs px-3 py-1 rounded-full">Sign up</button>
                    <button onClick={modalLogin.onOpen} className="bg-[#CDC9C0] text-xs px-3 py-1 rounded-full">Log in</button>
                  </>
                ) : (
                  <button onClick={handleLogout} className="bg-[#CDC9C0] text-xs px-3 py-1 rounded-full">Log out</button>
                )}
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
                <Button type="submit" color="primary" radius="full">POST</Button>
              </div>
            </form>

            <Tabs variant="underlined" aria-label="Tabs variants" >
              <Tab title="All" >
                {posts.map((post) => (
                  <Card key={post.id}>
                    <CardHeader className="gap-2">
                      <Avatar size="sm" />
                      <p className="font-bold uppercase">{post.user_id}</p>
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
        <LoginModal />
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
