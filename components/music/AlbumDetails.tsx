// AlbumDetails.tsx

import { Album, Artist } from '@/types';
import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { Card, CardBody, CardHeader, Divider, ScrollShadow } from '@nextui-org/react';
import { FaSpotify, FaYoutube } from 'react-icons/fa';
import { AlbumDetails as Details } from '@/types';
import { FaRegClock } from "react-icons/fa";
import AlbumSkeletonPage from './SkeletonAlbumDetails';


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
    const [variants, setVariants] = useState<Details[]>([]);
    useEffect(() => {
        if (albumId) {
            const fetchAlbum = async () => {
                const response = await fetch(`/api/${albumId}`);
                const data = await response.json();
                console.log(data);
                setAlbum(data);
            };
            const fetchAlbumVariants = async () => {
                const response = await fetch(`/api/${albumId}/variants`);
                const data = await response.json();
                setVariants(data.filteredVariants);
            };

            fetchAlbum();
            fetchAlbumVariants();

        }
    }, [albumId]);

    if (!album) return <AlbumSkeletonPage />;

    return (
        <div className="flex gap-5 pl-[58px] pr-[131px] pt-[105px] pb-[80px] md:pb-[144px] h-full">
            <div className="w-2/3 h-full flex flex-col gap-5">
                <div className="h-[40%] flex flex-col gap-7">
                    <div className="w-full flex gap-6">
                        <Image src={album.images[0].url} alt={`Cover album ${album.name}`} width={180} height={180} />
                        <div className='flex flex-col justify-between text-white'>
                            <div></div>
                            <div className='flex flex-col gap-1'>
                                <h1 className='text-5xl font-bold'>{album.name}</h1>
                                <p className='font-bold'>{album.tracks.items.length}&nbsp;songs,&nbsp;{calculateAlbumDuration(album)}</p>
                            </div>
                        </div>
                    </div>
                    {variants && (
                        <div className='flex mt-7 gap-4'>
                            {variants.map((variant, index) => (
                                <div key={index}>
                                    {variant.images && <Image src={variant.images[0]?.url} alt={variant.name} width={58} height={58} />}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                <Card className="h-[60%] flex flex-col bg-black rounded-2xl text-[#a7a7a7] font-inter">
                    <CardHeader className='justify-between w-full pl-5 pr-8 pt-4 '>
                        <div className='flex gap-4'>
                            <p>#</p>
                            <p>Title</p>
                        </div>
                        <FaRegClock size={16} />
                    </CardHeader>
                    <Divider orientation='horizontal' />
                    <CardBody className='p-0'>
                        <ScrollShadow>
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
                        </ScrollShadow>
                    </CardBody>
                </Card>
            </div>
            <div className="w-1/3 h-full flex flex-col gap-5">
                <div className="h-[40%] flex flex-col gap-5 text-white">
                    <div className='bg-[#3E3E3E] h-1/3 flex items-center justify-between px-8 rounded-2xl'>
                        <h2 className='font-impact '>Stream</h2>
                        <div className='flex gap-3'>
                            <FaSpotify size={24} />
                            <FaSpotify size={24} />
                            <FaSpotify size={24} />
                        </div>
                    </div>
                    <div className='bg-[#3E3E3E] h-2/3 rounded-2xl py-8 px-5 font-inter'>
                        <p><span className='font-bold'>Label:</span>&nbsp;{album.label}</p>
                        <p><span className='font-bold'>Release Date:</span>&nbsp;{translateDate(album.release_date)}</p>
                        <p className='mt-4'><span className='font-bold'>Produced by:</span>&nbsp;</p>
                    </div>
                </div>
                <div className="h-[60%] flex flex-col items-center gap-5 bg-[#3E3E3E] rounded-2xl py-3 px-5 text-white">
                    <h2 className="font-dancing capitalize text-4xl font-semibold text-center">music videos</h2>
                    <ScrollShadow hideScrollBar className="flex flex-col items-center gap-4 overflow-scroll">
                        <div className="w-[180px] min-h-[120px] bg-white/50 flex items-center justify-center rounded-2xl">
                            <FaYoutube size={46} />
                        </div>
                        <div className="w-[180px] min-h-[120px] bg-white/50 flex items-center justify-center rounded-2xl">
                            <FaYoutube size={46} />
                        </div>
                        <div className="w-[180px] min-h-[120px] bg-white/50 flex items-center justify-center rounded-2xl">
                            <FaYoutube size={46} />
                        </div>
                        <div className="w-[180px] min-h-[120px] bg-white/50 flex items-center justify-center rounded-2xl">
                            <FaYoutube size={46} />
                        </div>
                        <div className="w-[180px] min-h-[120px] bg-white/50 flex items-center justify-center rounded-2xl">
                            <FaYoutube size={46} />
                        </div>
                    </ScrollShadow>
                </div>
            </div>
        </div>
    );
}
