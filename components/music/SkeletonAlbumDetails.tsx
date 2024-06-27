import { Skeleton, Card, CardHeader, CardBody, Divider, ScrollShadow } from '@nextui-org/react';
import React from 'react';
import { FaRegClock, FaSpotify, FaYoutube } from 'react-icons/fa';

const AlbumSkeletonPage = () => {
    return (
        <div className="flex gap-5 pl-[58px] pr-[131px] pt-[105px] pb-[80px] md:pb-[144px] h-full dark">
            <div className="w-2/3 h-full flex flex-col gap-5">
                <div className="h-[40%] flex flex-col gap-7">
                    <div className="w-full flex gap-6">
                        <Skeleton className='w-[180px] aspect-square' />
                        <div className='flex flex-col justify-between text-white w-full'>
                            <div></div>
                            <div className='flex flex-col gap-1 w-full'>
                                <Skeleton className='w-[60%] h-10' />
                                <Skeleton className='w-[40%] h-5' />
                            </div>
                        </div>
                    </div>
                    <div className='flex mt-7 gap-4'>
                        {[1, 2, 3].map((_, index) => (
                            <Skeleton key={index} className='w-[58px] aspect-square' />
                        ))}
                    </div>
                </div>
                <Card className="h-[60%] flex flex-col bg-black rounded-2xl text-[#a7a7a7] font-inter">
                    <CardHeader className='justify-between w-full pl-5 pr-8 pt-4'>
                        <div className='flex gap-4'>
                            <p>#</p>
                            <p>Title</p>
                        </div>
                        <FaRegClock size={16} />
                    </CardHeader>
                    <Divider orientation='horizontal' />
                    <CardBody className='p-0'>
                        {[1, 2, 3, 4, 5].map((_, index) => (
                            <div key={index} className='flex pl-5 pr-8 py-2 items-center justify-between cursor-pointer bg-black hover:bg-slate-800 transition-all duration-100'>
                                <div className='flex gap-4 items-center'>
                                    <Skeleton className='w-5 aspect-square' />
                                    <div className='flex flex-col'>
                                        <Skeleton className='w-[100px] h-5' />
                                        <Skeleton className='w-20 h-5' />
                                    </div>
                                </div>
                                <Skeleton className='w-10 h-5' />
                            </div>
                        ))}
                    </CardBody>
                </Card>
            </div>
            <div className="w-1/3 h-full flex flex-col gap-5">
                <div className="h-[40%] flex flex-col gap-5 text-white">
                    <div className='bg-[#3E3E3E] h-1/3 flex items-center justify-between px-8 rounded-2xl'>
                        <Skeleton className='w-[40%] h-[30px]' />
                        <div className='flex gap-3'>
                            <FaSpotify size={24} />
                            <FaSpotify size={24} />
                            <FaSpotify size={24} />
                        </div>
                    </div>
                    <div className='bg-[#3E3E3E] h-2/3 rounded-2xl py-8 px-5 font-inter'>
                        <Skeleton className='w-[60%] h-5' />
                        <Skeleton className='w-[40%] h-5' />
                        <Skeleton className='w-[80%] h-5 mt-4' />
                    </div>
                </div>
                <div className="h-[60%] flex flex-col items-center gap-5 bg-[#3E3E3E] rounded-2xl py-3 px-5 text-white">
                    <Skeleton className='w-[50%] h-10' />
                    <ScrollShadow hideScrollBar className="flex flex-col items-center gap-4 overflow-scroll">
                        {[1, 2, 3, 4, 5].map((_, index) => (
                            <div key={index} className="w-[180px] min-h-[120px] bg-white/50 flex items-center justify-center rounded-2xl">
                                <FaYoutube size={46} />
                            </div>
                        ))}
                    </ScrollShadow>
                </div>
            </div>
        </div>
    );
};

export default AlbumSkeletonPage;
