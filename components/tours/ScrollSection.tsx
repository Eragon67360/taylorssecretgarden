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
                        end: () => `+=${totalWidth}`,
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

            console.log("Setting up image triggers");
            images.forEach((image, index) => {
                if (sectionRef.current && sectionRef.current.children[index]) {
                    const element = sectionRef.current.children[index];
                    console.log(`Setting up trigger for image ${index + 1}`);

                    const imgTrigger = ScrollTrigger.create({
                        trigger: element,
                        start: () => `top+=${index * (imageWidth + spaceBetween)} center`,
                        end: () => `top+=${(index + 1) * (imageWidth + spaceBetween)} center`,
                        toggleClass: { targets: element, className: "active" },
                        markers: true,
                        onEnter: () => console.log(`Entering: Image ${index + 1}`),
                        onLeave: () => console.log(`Leaving: Image ${index + 1}`),
                        onEnterBack: () => console.log(`Entering Back: Image ${index + 1}`),
                        onLeaveBack: () => console.log(`Leaving Back: Image ${index + 1}`),
                        onToggle: (self) => console.log(`Toggled: Image ${index + 1} is ${self.isActive ? 'active' : 'inactive'}`),
                    });

                    console.log(`Trigger for image ${index + 1} set up`, imgTrigger);
                } else {
                    console.log(`Element not found for image ${index + 1}`);
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
