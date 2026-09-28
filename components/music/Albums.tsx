'use client'
import React, { useEffect, useState } from 'react'
import Image from 'next/image';

import { Album } from '@/types';

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
                <div className="flex flex-col gap-5 overflow-scroll no-scrollbar scroll-fade-y">
                    {albums.map((album, index) => (
                        <button key={index} className='cursor-pointer grayscale-0 hover:grayscale transition-all duration-300' onClick={() => onSelectAlbum(album.id)}>
                            <Image alt={`Cover Album ${album.name}`} height={180} priority={index === 0} src={album.images[0].url} width={180} />
                        </button>
                    ))}
                </div>
            )}
        </>
    )
}
