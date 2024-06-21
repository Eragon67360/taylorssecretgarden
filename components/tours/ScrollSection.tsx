'use client'
import React, { useRef, useEffect, useState, useContext } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/dist/ScrollTrigger";
import Image from 'next/image';
import { VideoContext } from "@/context/VideoContext";
import CldImage from "../ui/CldImageWrapper";
import tours from '@/public/json/tours.json'
import Link from "next/link";

// const images = [
//     'https://res.cloudinary.com/dluezegi8/image/upload/f_auto,q_auto/v1/images/upload/taylorssecretgarden/tours/eras',
//     'https://res.cloudinary.com/dluezegi8/image/upload/f_auto,q_auto/v1/images/upload/taylorssecretgarden/tours/reputation',
//     'https://res.cloudinary.com/dluezegi8/image/upload/f_auto,q_auto/v1/images/upload/taylorssecretgarden/tours/1989',
//     'https://res.cloudinary.com/dluezegi8/image/upload/f_auto,q_auto/v1/images/upload/taylorssecretgarden/tours/red',
//     'https://res.cloudinary.com/dluezegi8/image/upload/f_auto,q_auto/v1/images/upload/taylorssecretgarden/tours/speak_now',
//     'https://res.cloudinary.com/dluezegi8/image/upload/f_auto,q_auto/v1/images/upload/taylorssecretgarden/tours/fearless',
// ];

// const videos = [
//     'https://res.cloudinary.com/dluezegi8/video/upload/f_auto:video,q_auto/v1/images/upload/taylorssecretgarden/tours/eras',
//     'https://res.cloudinary.com/dluezegi8/video/upload/f_auto:video,q_auto/v1/images/upload/taylorssecretgarden/tours/reputation',
//     'https://res.cloudinary.com/dluezegi8/video/upload/f_auto:video,q_auto/v1/images/upload/taylorssecretgarden/tours/nineteeneightynine',
//     'https://res.cloudinary.com/dluezegi8/video/upload/f_auto:video,q_auto/v1/images/upload/taylorssecretgarden/tours/red',
//     'https://res.cloudinary.com/dluezegi8/video/upload/f_auto:video,q_auto/v1/images/upload/taylorssecretgarden/tours/red',
//     'https://res.cloudinary.com/dluezegi8/video/upload/f_auto:video,q_auto/v1/images/upload/taylorssecretgarden/tours/red',
// ];

// const tours = [
//     'The Eras Tour',
//     'Reputation Tour',
//     '1989 Tour',
//     'The Red Tour',
//     'Speak Now World Tour',
//     'Fearless Tour',
// ];

// const dates = [
//     '2023-2024',
//     '2018',
//     '2015',
//     '2013-2014',
//     '2011-2012',
//     '2009-2010',
// ];

const ScrollSection = () => {
    const sectionRef = useRef<HTMLDivElement | null>(null);
    const triggerRef = useRef<HTMLDivElement | null>(null);
    const [scrollTriggerInstance, setScrollTriggerInstance] = useState<ScrollTrigger | null>(null);
    const { setVideoSrc } = useContext(VideoContext);


    gsap.registerPlugin(ScrollTrigger);

    const imageWidth = 280;
    const spaceBetween = 20;
    const totalWidth = tours.length * imageWidth + (tours.length - 1) * spaceBetween;

    const updateTranslateX = () => {
        if (sectionRef.current && triggerRef.current) {
            const viewportWidth = window.innerWidth;
            const initialTranslateX = (viewportWidth / 2) - (imageWidth / 2);
            // gsap.set(sectionRef.current, { translateX: initialTranslateX });

            if (scrollTriggerInstance) {
                scrollTriggerInstance.kill();
            }

            const newScrollTriggerInstance = gsap.fromTo(
                sectionRef.current,
                {
                    translateX: initialTranslateX,
                },
                {
                    translateX: -totalWidth + initialTranslateX,
                    ease: "none",
                    duration: 1,
                    scrollTrigger: {
                        trigger: triggerRef.current,
                        start: "top top",
                        end: () => `+=${totalWidth}`,
                        scrub: 0,
                        pin: true,
                        snap: {
                            snapTo: 1 / tours.length,
                            duration: 1,
                            ease: "power1.inOut",
                        },
                        onUpdate: self => {
                            const progress = self.progress;
                            const activeIndex = Math.floor(progress * tours.length);
                            setVideoSrc(tours[activeIndex].videoUrl);
                        },
                    },
                }
            );

            const newScrollTrigger = newScrollTriggerInstance.scrollTrigger;
            if (newScrollTrigger) {
                setScrollTriggerInstance(newScrollTrigger);
            }

            tours.forEach((image, index) => {
                if (sectionRef.current) {
                    const element = sectionRef.current.querySelectorAll('img')[index];
                    if (element) {
                        const imgTrigger = ScrollTrigger.create({
                            trigger: element,
                            start: () => `top+=${index * (imageWidth + spaceBetween) - imageWidth - spaceBetween} center`,
                            end: () => `top+=${index * (imageWidth + spaceBetween)} center`,
                            toggleClass: { targets: element, className: "active" },
                            markers: false,
                        });

                    }
                }
            });

            ScrollTrigger.refresh();
        }
    };

    useEffect(() => {
        updateTranslateX();

        window.addEventListener('resize', updateTranslateX);

        return () => {
            if (scrollTriggerInstance) {
                scrollTriggerInstance.kill();
            }
            ScrollTrigger.getAll().forEach(trigger => trigger.kill());
            window.removeEventListener('resize', updateTranslateX);
        };
    }, [sectionRef, triggerRef, totalWidth]);

    const generateSlug = (name: string) => {
        return name.toLowerCase().replace(/ /g, '-');
    };


    return (
        <>
            <section className="overflow-hidden z-10">
                <div ref={triggerRef} className="overflow-hidden">
                    <div ref={sectionRef} className="flex flex-col h-screen">
                        <div className="bg-transparent h-full min-h-32 flex flex-col justify-end" style={{ width: totalWidth }}>
                            <div className="bg-black/40 py-4 space-y-4">
                                <div className="text-white font-bold text-2xl text-center uppercase flex justify-between">
                                    {tours.map((tour, index) => (
                                        <div className="w-full" style={{ maxWidth: imageWidth }}>{tour.tour} <br />{tour.date}</div>
                                    ))}
                                </div>
                                <div className="relative h-2 mx-auto" style={{ width: totalWidth - imageWidth }}>
                                    <div className="absolute top-1/2 left-0 transform -translate-y-1/2 w-full h-1 bg-white"></div>
                                    {tours.map((tour, index) => (
                                        <div
                                            key={index}
                                            className="absolute top-1/2 transform -translate-y-1/2 bg-white rounded-full"
                                            style={{ width: '20px', height: '20px', left: `calc(${index} * (100% / ${tours.length - 1}))` }}
                                        ></div>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className={`h-full flex relative text-white font-bold text-2xl overflow-hidden text-ellipsis`} style={{ width: totalWidth, gap: spaceBetween }}>
                            {tours.map((tour, index) => (
                                <Link key={index} className="h-full py-44 flex items-end justify-center snap-start" href={`/tours/${generateSlug(tour.tour)}`}>
                                    <CldImage src={tour.imageUrl} alt={`Tour ${index + 1}`} className="image w-[280px] h-[400px] object-cover rounded-2xl" width={280} height={400} />
                                </Link>
                            ))}
                        </div>

                    </div>
                </div>
            </section>
        </>
    );
}

export default ScrollSection;
