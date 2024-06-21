'use client'
import { Avatar, Button, Textarea, Tabs, Tab, Card, CardBody, CardFooter, CardHeader } from "@nextui-org/react";

export default function ForumPage() {

  let tabs = [
    {
      id: "all",
      label: "All",
      content: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat."
    },
    {
      id: "following",
      label: "Following",
      content: "Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur."
    }
  ];

  return (
    <>
      <div className="w-full flex flex-col items-center">
        <div className="w-full h-[156px] bg-gradient-to-r from-[#7A2E3A] to-[#4C3337] flex flex-col items-center justify-center text-white">
          <h1 className="text-xl text-center font-inter font-bold">Welcome to the swift<span className="text-[#F00]">ter</span></h1>
          <p className=" text-center text-[10px] mt-1">A social media made by swifties to talk about Taylor Swift for swifties</p>
          <div className="mt-6 rounded-full w-[580px] h-7 bg-white px-[14px] py-2 text-[#6E6E6E] flex items-center">Search</div>
        </div>

        <div className="w-full max-w-[1180px] flex gap-5 mt-8">
          <div className="flex flex-col gap-5 w-full max-w-[280px]">
            <div className="w-full rounded-2xl bg-[#D9D9D9] flex items-center gap-2 p-[18px] text-black">
              <Avatar className="bg-white" size="sm" />
              <div className="flex flex-col text-[10px]">
                <p>Name</p>
                <p>@anonymous</p>
              </div>
              <button className="bg-[#CDC9C0] text-xs px-3 py-1 rounded-full">Sign up</button>
              <button className="bg-[#CDC9C0] text-xs px-3 py-1 rounded-full">Log in</button>
            </div>
          </div>

          <div className="flex flex-col gap-5 w-full max-w-[480px]">
            <div className="w-full rounded-2xl bg-[#D9D9D9] flex flex-col items-center gap-2 p-[18px] text-black py-4">
              <Textarea className="p-2 rounded-lg w-full" placeholder="Start a conversation..." color="primary" variant="underlined" />
              <div className="w-full flex justify-end"><Button color="primary" radius="full">POST</Button></div>
            </div>

            <Tabs variant="underlined" aria-label="Tabs variants" >

              <Tab title="All">
                <Card>
                  <CardHeader className="gap-2">
                    <Avatar size="sm" />
                    <p className="font-bold uppercase">Name...</p>
                  </CardHeader>
                  <CardBody>
                    This is a post
                  </CardBody>
                  <CardFooter>
                    <p>Posted on 15. June 2024</p>
                  </CardFooter>
                </Card>
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
          <div className="flex flex-col gap-5 w-full max-w-[380px]">
            <div className="w-full rounded-2xl bg-[#D9D9D9] flex items-center gap-2 p-[18px] text-black h-8">

            </div>

          </div>
        </div>
      </div>
    </>
  );
}
