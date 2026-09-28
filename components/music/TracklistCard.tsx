import React from 'react';
import { FaRegClock } from 'react-icons/fa';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface TracklistCardProps {
    children: React.ReactNode;
    /** Classes for the line under the "# / Title" header. */
    separatorClassName?: string;
    /** Classes for the scrolling list of tracks. */
    contentClassName?: string;
}

// The black "# / Title / duration" card holding an Album's tracks, shared by
// the details view and its loading skeleton.
export default function TracklistCard({ children, separatorClassName, contentClassName }: TracklistCardProps) {
    return (
        <Card className="h-[60%] gap-0 py-0 text-base ring-0 shadow-[0_0_15px_0_rgb(0_0_0/0.03),0_2px_30px_0_rgb(0_0_0/0.08),0_0_1px_0_rgb(0_0_0/0.3)] bg-black rounded-2xl text-[#a7a7a7] font-inter">
            <CardHeader className='flex items-center justify-between w-full pl-5 pr-8 pt-4 pb-3'>
                <div className='flex gap-4'>
                    <p>#</p>
                    <p>Title</p>
                </div>
                <FaRegClock size={16} />
            </CardHeader>
            <Separator className={cn('bg-[#111111]/15', separatorClassName)} />
            <CardContent className={cn('flex-auto overflow-y-auto px-0', contentClassName)}>
                {children}
            </CardContent>
        </Card>
    );
}
