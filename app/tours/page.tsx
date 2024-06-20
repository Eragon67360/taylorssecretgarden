'use client'
import React, {  } from "react";
import ScrollSection from "@/components/tours/ScrollSection";

export default function Tours() {

  return (

    <>
      <div className="z-0 fixed top-0 left-0 w-[100dvw] h-[100dvh] bg-tours bg-cover bg-no-repeat flex flex-col overflow-hidden">
        <h1 className="text-8xl font-bold uppercase text-white mt-32 ml-32">Tours</h1>
        <h1 className="text-2xl text-white mt-6 ml-32 p-4 w-[480px] shadow-lg shadow-white rounded-lg">The eras tour is...</h1>
      </div>
      <ScrollSection />
    </>

  );
}
