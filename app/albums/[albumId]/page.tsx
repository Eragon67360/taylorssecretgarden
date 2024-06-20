"use client"

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Card, CardBody } from '@nextui-org/react';
import Image from 'next/image';

interface Track {
    id: string;
    name: string;
    duration_ms: number;
    preview_url: string;
}

interface AlbumDetails {
    id: string;
    name: string;
    images: { url: string }[];
    release_date: string;
    genres: string[];
    total_duration_ms: number;
    tracks: { items: Track[] };
}

interface Variant {
    album: string;
    cover: string;
    newTracks: string[];
}

function formatDuration(duration_ms: number): string {
    const totalSeconds = Math.floor(duration_ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const formattedHours = hours.toString().padStart(2, '0');
    const formattedMinutes = minutes.toString().padStart(2, '0');
    const formattedSeconds = seconds.toString().padStart(2, '0');

    return `${formattedHours}:${formattedMinutes}:${formattedSeconds}`;
}

function calculateAlbumDuration(album: AlbumDetails): string {
    const totalDurationMs = album.tracks.items.reduce((acc, track) => acc + track.duration_ms, 0);
    return formatDuration(totalDurationMs);
}

const AlbumDetailsPage = () => {
    const pathname = usePathname();
    const albumId = pathname.split('/').pop();
    const [album, setAlbum] = useState<AlbumDetails | null>(null);
    const [variants, setVariants] = useState<AlbumDetails[]>([]);

    const [trackName, setTrackName] = useState<string>("");
    const [bonusTracks, setBonusTracks] = useState<Variant[]>([]);

    useEffect(() => {
        if (albumId) {
            const fetchAlbumDetails = async () => {
                const response = await fetch(`/api/${albumId}`);
                const data = await response.json();
                setAlbum(data);
            };

            const fetchAlbumVariants = async () => {
                const response = await fetch(`/api/${albumId}/variants`);
                const data = await response.json();
                setVariants(data.filteredVariants);
                setBonusTracks(data.bonusTracks);
            };
            fetchAlbumDetails();
            fetchAlbumVariants();
        }
    }, [albumId]);

    const playTrack = (name: string) => {
        setTrackName(name);
    }

    return (

        <>
            {album ? (
                <>
                    <div className="font-inter mx-auto px-4 flex flex-col mt-24">
                        <div className='flex w-full gap-20'>
                            <Card className='bg-transparent border border-black p-8 h-fit w-fit' radius='none'>
                                <CardBody>
                                    <Image src={album.images[0].url} alt={album.name} className="rounded-none" width={360} height={360} />
                                    <div className='flex mt-7 gap-2'>
                                        <p className='font-impact'>alternative covers</p>
                                        {variants.map((variant, index) => (
                                            <div key={index}>
                                                {variant.images && <Image src={variant.images[0]?.url} alt={variant.name} width={54} height={54} />}
                                            </div>
                                        ))}
                                    </div>
                                </CardBody>
                            </Card>

                            <div className='flex flex-col w-full'>
                                <div className='flex justify-between w-full'>
                                    <div className='flex flex-col font-dancing gap-4'>
                                        <h2 className='text-6xl'>Taylor Swift</h2>
                                        <p className='text-2xl'>{album.name}</p>
                                    </div>

                                    <div className='flex gap-4'>
                                        <div className="custom-shape font-extrabold text-[10px] flex justify-center items-center text-center">{album.release_date}</div>
                                        <div className="custom-shape font-extrabold text-[10px] flex justify-center items-center text-center">{calculateAlbumDuration(album)}</div>
                                        <div className="custom-shape"></div>
                                    </div>
                                </div>

                                <div>
                                    <h2 className='font-impact text-base mt-6'>Tracklist</h2>

                                    <h2 className='font-bold'>The following tracks are all tracks in variant albums that are NOT in the original album (given by Cristina)</h2>
                                    <ul>
                                        {bonusTracks.map((variant, index) => (
                                            <li key={index}>
                                                <h3>{variant.album}</h3>
                                                <ul>
                                                    {variant.newTracks.map((track, trackIndex) => (
                                                        <li key={trackIndex}>{track}</li>
                                                    ))}
                                                </ul>
                                            </li>
                                        ))}
                                    </ul>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 space-x-5 ">
                                        <ul>
                                            {album.tracks.items.slice(0, Math.ceil(album.tracks.items.length / 2)).map((track, index) => (
                                                <li
                                                    key={track.id}
                                                    className={`break-words rounded-full bg-[#A5C9A5] px-4 py-2 my-2 transition-all duration-200 ${track.preview_url !== "" ? "cursor-pointer hover:scale-105" : "cursor-default"}`}
                                                    role="button"
                                                    tabIndex={track.preview_url !== "" ? 0 : undefined}
                                                    onClick={track.preview_url !== "" ? () => playTrack(track.name) : undefined}
                                                >
                                                    {index + 1}. {track.name}
                                                </li>
                                            ))}
                                        </ul>
                                        <ul>
                                            {album.tracks.items.slice(Math.ceil(album.tracks.items.length / 2)).map((track, index) => (
                                                <li
                                                    key={track.id}
                                                    role="button"
                                                    tabIndex={track.preview_url !== "" ? 0 : undefined}                                                    
                                                    className="break-words rounded-full bg-[#A5C9A5] px-4 py-2 my-2 cursor-pointer hover:scale-105 transition-all duration-200"
                                                    onClick={track.preview_url !== "" ? () => playTrack(track.name) : undefined}
                                                >
                                                    {Math.ceil(album.tracks.items.length / 2) + index + 1}. {track.name}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </>


            ) : (
                <div className='flex items-center justify-center text-5xl min-h-screen'>Loading...</div>
            )}
        </>

    );
};

export default AlbumDetailsPage;
