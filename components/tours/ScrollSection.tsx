'use client'
import React, { useRef, useEffect, useState, useContext } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/dist/ScrollTrigger";
import Image from 'next/image';
import { VideoContext } from "@/context/VideoContext";
import CldImage from "../ui/CldImageWrapper";

const images = [
    'https://res.cloudinary.com/dluezegi8/image/upload/f_auto,q_auto/v1/images/upload/taylorssecretgarden/tours/eras',
    'https://res.cloudinary.com/dluezegi8/image/upload/f_auto,q_auto/v1/images/upload/taylorssecretgarden/tours/reputation',
    'https://res.cloudinary.com/dluezegi8/image/upload/f_auto,q_auto/v1/images/upload/taylorssecretgarden/tours/1989',
    'https://res.cloudinary.com/dluezegi8/image/upload/f_auto,q_auto/v1/images/upload/taylorssecretgarden/tours/red',
    'https://res.cloudinary.com/dluezegi8/image/upload/f_auto,q_auto/v1/images/upload/taylorssecretgarden/tours/speak_now',
    'https://res.cloudinary.com/dluezegi8/image/upload/f_auto,q_auto/v1/images/upload/taylorssecretgarden/tours/fearless',
];

const videos = [
    '/img/tours/eras.webm',
    'https://res.cloudinary.com/dluezegi8/video/upload/f_auto:video,q_auto/v1/images/upload/taylorssecretgarden/tours/reputation',
    'https://res.cloudinary.com/dluezegi8/video/upload/f_auto:video,q_auto/v1/images/upload/taylorssecretgarden/tours/nineteeneightynine',
    'https://res.cloudinary.com/dluezegi8/video/upload/f_auto:video,q_auto/v1/images/upload/taylorssecretgarden/tours/red',
    'https://res.cloudinary.com/dluezegi8/video/upload/f_auto:video,q_auto/v1/images/upload/taylorssecretgarden/tours/red',
    'https://res.cloudinary.com/dluezegi8/video/upload/f_auto:video,q_auto/v1/images/upload/taylorssecretgarden/tours/red',
];

const ScrollSection = () => {
    const sectionRef = useRef<HTMLDivElement | null>(null);
    const triggerRef = useRef<HTMLDivElement | null>(null);
    const [scrollTriggerInstance, setScrollTriggerInstance] = useState<ScrollTrigger | null>(null);
    const { setVideoSrc } = useContext(VideoContext);


    gsap.registerPlugin(ScrollTrigger);

    const imageWidth = 280;
    const spaceBetween = 20;
    const totalWidth = images.length * imageWidth + (images.length - 1) * spaceBetween;

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
                            snapTo: 1 / images.length,
                            duration: 1,
                            ease: "power1.inOut",
                        },
                        onUpdate: self => {
                            const progress = self.progress;
                            const activeIndex = Math.floor(progress * images.length);
                            setVideoSrc(videos[activeIndex]);
                        },
                    },
                }
            );

            const newScrollTrigger = newScrollTriggerInstance.scrollTrigger;
            if (newScrollTrigger) {
                setScrollTriggerInstance(newScrollTrigger);
            }

            images.forEach((image, index) => {
                if (sectionRef.current && sectionRef.current.children[index]) {
                    const element = sectionRef.current.children[index].querySelector('img');
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


    return (
        <>
            <section className="overflow-hidden z-10">
                <div ref={triggerRef} className="overflow-hidden">
                    <div ref={sectionRef} className={`h-screen flex relative text-white font-bold text-2xl overflow-hidden text-ellipsis`} style={{ width: totalWidth, gap: spaceBetween }}>
                        {images.map((image, index) => (
                            <div key={index} className="h-screen py-44 flex items-end justify-center snap-start">
                                <CldImage src={image} alt={`Tour ${index + 1}`} className="image w-[280px] h-[400px] object-cover rounded-2xl" width={280} height={400}/>
                                {/* <Image src={image} alt={`Tour ${index + 1}`} className="image w-[280px] h-[400px] object-cover rounded-2xl" width={280} height={400} /> */}
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        </>
    );
}

export default ScrollSection;
