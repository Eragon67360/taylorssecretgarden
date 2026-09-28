'use client'
import React, { useState } from "react";

import AlbumDetails from "@/components/music/AlbumDetails";
import Albums from "@/components/music/Albums";

export default function MusicLayout({
  children,
}: {
  children: React.ReactNode;
}) {

  const [selectedAlbumId, setSelectedAlbumId] = useState<string | null>("227786");

  const handleSelectAlbum = (albumId: string) => {
    setSelectedAlbumId(albumId);
  };

  return (
    <section className="bg-[#282828] flex h-screen w-screen">
      <div className="pl-[130px] flex flex-col gap-2 items-center pt-16 pb-10 w-1/4">
        <h1 className="uppercase font-bold text-2xl text-white">Albums</h1>
        <Albums onSelectAlbum={handleSelectAlbum} />
      </div>

      <div className="w-3/4 rounded-ss-xl bg-[#A5C9A5]">
        {selectedAlbumId ? <AlbumDetails albumId={selectedAlbumId} /> : children}
      </div>
    </section>
  );
}
