import React from "react"
import tours from "@/public/json/tours.json"
import Link from 'next/link';
import Image from "next/image";
import CldImage from '@/components/ui/CldImageWrapper';

export default function Tour({ params }: { params: { tour: string } }) {

    const tour = tours.find((t) => t.slug === params.tour);

    if (!tour) {
        return <div>There is no data for this tour for now</div>;
    }

    return (
        <>
            <div className='w-full flex gap-5 justify-between'>
                <div className='flex flex-col gap-5 w-full mt-[92px]'>
                    <div className='px-7 py-3 border border-black rounded-2xl'>
                        <h2 className='uppercase text-[40px] font-extrabold text-center font-playfair'>Tour Dates</h2>

                        <p className='text-xs text-end w-full mt-[14px]'>150 shows</p>
                        <p className='text-xs text-start w-full mt-[14px] capitalize'>start date: 2023</p>
                        <p className='text-xs text-start w-full mt-[14px] capitalize'>end date: 2024</p>
                        <div className='flex justify-end w-full'>
                            <Link href={'#'} className='text-xs text-end w-full mt-[14px]'>See all dates</Link>
                        </div>
                    </div>

                    <div className="rounded-2xl w-full aspect-square flex items-end"
                        style={{
                            background: "url('https://res.cloudinary.com/dluezegi8/image/upload/f_auto,q_auto/v1/images/upload/taylorssecretgarden/tours/the-eras-tour/gallery') lightgray -4.274px -84.206px / 153.228% 149.857% no-repeat"
                        }}
                    >
                        <p className='text-white text-6xl font-extrabold font-playfair uppercase p-[30px] mix-blend-soft-light'>Gallery</p>
                    </div>

                    <div className="rounded-2xl w-full h-[232px] flex items-end border border-black bg-white">
                        <p className='text-black text-[40px] font-bold font-playfair uppercase pb-[52px] w-full text-center'>Bracelets</p>
                    </div>
                </div>
                <div className='flex flex-col gap-5 w-full'>
                    <h1 className={`mt-12  text-[40px] font-normal text-center`} style={{fontFamily: `var(--font-${tour.font})`}} >{tour?.tour}</h1>
                    <CldImage
                        src={'https://res.cloudinary.com/dluezegi8/image/upload/f_auto,q_auto/v1/images/upload/taylorssecretgarden/tours/the-eras-tour/center'}
                        alt='Centered image of the tour'
                        width={380}
                        height={380}
                        className='rounded-2xl mt-[60px]'
                    />
                    <div className="rounded-2xl w-full h-[248px] flex items-end border border-black"
                        style={{
                            background: "url('https://res.cloudinary.com/dluezegi8/image/upload/f_auto,q_auto/v1/images/upload/taylorssecretgarden/tours/the-eras-tour/outfits') lightgray -5.5px -144px / 102.895% 210.215% no-repeat"
                        }}
                    >
                        <p className='text-black text-lg font-bold font-playfair uppercase p-0 w-full text-center'>Outfits</p>
                    </div>
                </div>
                <div className='flex flex-col gap-5 w-full mt-[92px]'>
                    <div className="w-full h-[580px] bg-[#D9D9D9CC] p-10 rounded-2xl">
                        <p className='uppercase text-xs font-inter'>Spotify setlist link</p>
                    </div>
                    <div className="rounded-2xl w-full h-[184px] p-5 flex flex-col"
                        style={{
                            background: "url('https://res.cloudinary.com/dluezegi8/image/upload/f_auto,q_auto,a_hflip/v1/images/upload/taylorssecretgarden/tours/the-eras-tour/watch') lightgray 0px -1.097px / 112.895% 131.16% no-repeat"
                        }}
                    >
                        <p className='uppercase text-white font-inter text-[20px] font-bold w-full text-end'>Watch it on</p>
                        <div className='w-full flex justify-end'>
                            <CldImage src='https://res.cloudinary.com/dluezegi8/image/upload/f_auto,q_auto/v1/images/upload/taylorssecretgarden/tours/the-eras-tour/disney' alt='Logo VOD' height={56} width={103.158} />
                        </div>
                    </div>
                </div>

            </div>
        </>
    )
}
