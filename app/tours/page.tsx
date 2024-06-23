"use client"
import React, { } from "react";
import ScrollSection from "@/components/tours/ScrollSection";
import CldVideo from "@/components/ui/CldVideoWrapper";
import { VideoProvider, VideoContext } from "@/context/VideoContext";

export default function Tours() {

  return (
    <VideoProvider>
      <VideoContext.Consumer>
        {({ videoSrc }) => (
          <>
            <div className="z-0 fixed top-0 left-0 w-[100dvw] h-[100dvh]  flex flex-col overflow-hidden">
              <video
                key={videoSrc}
                autoPlay
                loop
                muted
                className="z-0 absolute top-0 left-0 w-full h-full object-cover"
              >
                <source src={videoSrc} type="video/mp4" />
                Your browser does not support the video tag.
              </video>

              <h1 className="z-10 w-fit rounded-xl p-6 text-8xl font-bold uppercase text-white mt-32 ml-32 bg-black/25">Tours</h1>
            </div>
            <ScrollSection />
          </>
        )}
      </VideoContext.Consumer>
    </VideoProvider>


  );
}
