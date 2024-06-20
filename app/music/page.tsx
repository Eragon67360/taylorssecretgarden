"use client"

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

interface Album {
    id: string;
    name: string;
    images: { url: string }[];
}

const Music = () => {
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
        <div className="container mx-auto px-4 py-24">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {albums.map((album) => (
                    <Link key={album.id} href={`/albums/${album.id}`} className='group'>
                        <div className="cursor-pointer">
                            <img src={album.images[0].url} alt={album.name} className="rounded-lg" />
                            <p className="text-center mt-2 h-0 group-hover:h-16 transition-all duration-500 text-transparent group-hover:text-black">{album.name}</p>                            
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
};

export default Music;