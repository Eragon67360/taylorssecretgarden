import React from 'react';

import { Skeleton as BaseSkeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

import TracklistCard from './TracklistCard';

// NextUI's dark-theme skeleton look: square corners on zinc-800.
const Skeleton = ({ className }: { className?: string }) => (
    <BaseSkeleton className={cn('rounded-none bg-zinc-800', className)} />
);

const AlbumSkeletonPage = () => {
    return (
        <div className="flex gap-5 pl-[58px] pr-[131px] pt-[105px] pb-[80px] md:pb-[144px] h-full">
            <div className="w-2/3 h-full flex flex-col gap-5">
                <div className="h-[40%] flex flex-col gap-7">
                    <div className="w-full flex gap-6">
                        <Skeleton className='w-[180px] aspect-square' />
                        <div className='flex flex-col justify-between text-white w-full'>
                            <div />
                            <div className='flex flex-col gap-1 w-full'>
                                <Skeleton className='w-[60%] h-10' />
                                <Skeleton className='w-[40%] h-5' />
                            </div>
                        </div>
                    </div>
                </div>
                <TracklistCard separatorClassName='bg-white/15'>
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
                </TracklistCard>
            </div>
            <div className="w-1/3 h-full flex flex-col gap-5">
                <div className="h-[40%] flex flex-col gap-5 text-white">
                    <div className='bg-[#3E3E3E] rounded-2xl py-8 px-5 font-inter flex flex-col gap-1'>
                        <Skeleton className='w-[60%] h-5' />
                        <Skeleton className='w-[40%] h-5' />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AlbumSkeletonPage;
