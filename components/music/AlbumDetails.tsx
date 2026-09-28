'use client'
import React, { useEffect, useState } from 'react';
import Image from 'next/image';

import { Artist } from '@/types';
import { AlbumDetails as Details } from '@/types';

import AlbumSkeletonPage from './SkeletonAlbumDetails';
import TracklistCard from './TracklistCard';

interface AlbumDetailsProps {
    albumId: string;
}

function formatDuration(duration_ms: number): string {
    const totalSeconds = Math.floor(duration_ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const formattedHours = hours.toString().padStart(2, '0');
    const formattedMinutes = minutes.toString().padStart(2, '0');

    return `${formattedHours} h ${formattedMinutes} min`;
}

function calculateAlbumDuration(album: Details): string {
    const totalDurationMs = album.tracks.items.reduce((acc, track) => acc + track.duration_ms, 0);

    return formatDuration(totalDurationMs);
}

function translateDate(dateString: string): string {
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' };

    return date.toLocaleDateString('en-US', options);
}

function formatDurationTrack(durationMs: number): string {
    const minutes = Math.floor(durationMs / 60000);
    const seconds = Math.floor((durationMs % 60000) / 1000);

    // Pad seconds with leading zero if needed
    const paddedSeconds = seconds < 10 ? '0' + seconds : seconds;

    return `${minutes}:${paddedSeconds}`;
}

function formatArtists(artists: Artist[]): string {
    return artists.map(artist => artist.name).join(', ');
}

export default function AlbumDetails({ albumId }: AlbumDetailsProps) {
    const [album, setAlbum] = useState<Details | null>(null);

    useEffect(() => {
        if (albumId) {
            const fetchAlbum = async () => {
                const response = await fetch(`/api/${albumId}`);
                const data = await response.json();

                setAlbum(data);
            };

            fetchAlbum();
        }
    }, [albumId]);

    if (!album) return <AlbumSkeletonPage />;

    return (
        <div className="flex gap-5 pl-[58px] pr-[131px] pt-[105px] pb-[80px] md:pb-[144px] h-full">
            <div className="w-2/3 h-full flex flex-col gap-5">
                <div className="h-[40%] flex flex-col gap-7">
                    <div className="w-full flex gap-6">
                        <Image priority alt={`Cover album ${album.name}`} height={180} src={album.images[0].url} width={180} />
                        <div className='flex flex-col justify-between text-white'>
                            <div />
                            <div className='flex flex-col gap-1'>
                                <h1 className='text-5xl font-bold'>{album.name}</h1>
                                <p className='font-bold'>{album.tracks.items.length}&nbsp;songs,&nbsp;{calculateAlbumDuration(album)}</p>
                            </div>
                        </div>
                    </div>
                </div>
                <TracklistCard contentClassName='scroll-fade-y'>
                    {album.tracks.items.map((track, index) => (
                        <div key={index} className='flex pl-5 pr-8 py-2 items-center justify-between cursor-pointer bg-black hover:bg-slate-800 transition-all duration-100'>
                            <div className='flex gap-4 items-center'>
                                <p>{index + 1}</p>
                                <div className='flex flex-col'>
                                    <p className='font-bold text-white'>{track.name}</p>
                                    <div>{formatArtists(track.artists)}</div>
                                </div>
                            </div>
                            <div>{formatDurationTrack(track.duration_ms)}</div>
                        </div>
                    ))}
                </TracklistCard>
            </div>
            <div className="w-1/3 h-full flex flex-col gap-5">
                <div className="h-[40%] flex flex-col gap-5 text-white">
                    <div className='bg-[#3E3E3E] rounded-2xl py-8 px-5 font-inter'>
                        <p><span className='font-bold'>Label:</span>&nbsp;{album.label}</p>
                        <p><span className='font-bold'>Release Date:</span>&nbsp;{translateDate(album.release_date)}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
