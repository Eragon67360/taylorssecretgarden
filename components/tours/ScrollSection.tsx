import React, { useRef, useEffect, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/dist/ScrollTrigger";
import Image from 'next/image';

const images = [
    '/img/tours/eras.png',
    '/img/tours/reputation.png',
    '/img/tours/1989.png',
    '/img/tours/red.png',
    '/img/tours/speak_now.png',
    '/img/tours/fearless.png',
];

function ScrollSection() {
    const sectionRef = useRef<HTMLDivElement | null>(null);
    const triggerRef = useRef<HTMLDivElement | null>(null);
    const [scrollTriggerInstance, setScrollTriggerInstance] = useState<ScrollTrigger | null>(null);

    gsap.registerPlugin(ScrollTrigger);

    const imageWidth = 280;
    const spaceBetween = 20;
    const totalWidth = images.length * imageWidth + (images.length - 1) * spaceBetween;

    const updateTranslateX = () => {
        if (sectionRef.current && triggerRef.current) {
            const viewportWidth = window.innerWidth;
            const initialTranslateX = (viewportWidth / 2) - (imageWidth / 2);
            gsap.set(sectionRef.current, { translateX: initialTranslateX });

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
                        end: "bottom top",
                        scrub: 0.6,
                        pin: true,
                        snap: {
                            snapTo: 1 / images.length,
                            duration: 1,
                            ease: "power1.inOut",
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
                    console.log(index);
                    const imgTrigger = ScrollTrigger.create({
                        trigger: sectionRef.current.children[index],
                        start: "center center",
                        end: "center center",
                        toggleClass: { targets: sectionRef.current.children[index], className: "active" },
                        markers: false,
                    });
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
                    <div ref={sectionRef} className={`h-screen flex relative text-white font-bold text-2xl overflow-hidden`} style={{ width: totalWidth, gap: spaceBetween }}>
                        {images.map((image, index) => (
                            <div key={index} className="h-screen py-44 flex items-end justify-center snap-start">
                                <Image src={image} alt={`Tour ${index + 1}`} className="image w-[280px] h-[400px] object-cover rounded-2xl" width={280} height={400} />
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        </>
    );
}

export default ScrollSection;
