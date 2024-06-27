'use client'
import { Album } from '@/types';
import React, { useEffect, useState } from 'react'
import Image from 'next/image';
import { ScrollShadow } from "@nextui-org/scroll-shadow";

interface AlbumsProps {
    onSelectAlbum: (albumId: string) => void;
}

export default function Albums({ onSelectAlbum }: AlbumsProps) {
    const [albums, setAlbums] = useState<Album[]>([]);

    useEffect(() => {
        const fetchAlbums = async () => {
            const response = await fetch('/api/albums');
            const data = await response.json();
            setAlbums(data.items);
        };

        fetchAlbums();
    }, []);

    return (
        <>
            {albums && (
                <ScrollShadow hideScrollBar className="flex flex-col gap-5 overflow-scroll">
                    {albums.map((album, index) => (
                        <button key={index} onClick={() => onSelectAlbum(album.id)} className='cursor-pointer grayscale-0 hover:grayscale transition-all duration-300'>
                            <Image src={album.images[0].url} alt={`Cover Album ${album.name}`} width={180} height={180} />
                        </button>
                    ))}
                </ScrollShadow>
            )}
        </>
    )
}
