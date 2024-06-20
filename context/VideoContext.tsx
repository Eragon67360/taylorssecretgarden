"use client"
import React, { createContext, useState, ReactNode } from 'react';

interface VideoContextProps {
    videoSrc: string;
    setVideoSrc: (src: string) => void;
}

export const VideoContext = createContext<VideoContextProps>({
    videoSrc: '',
    setVideoSrc: () => {},
});

export const VideoProvider = ({ children }: { children: ReactNode }) => {
    const [videoSrc, setVideoSrc] = useState<string>('/img/tours/eras.webm');

    return (
        <VideoContext.Provider value={{ videoSrc, setVideoSrc }}>
            {children}
        </VideoContext.Provider>
    );
};
