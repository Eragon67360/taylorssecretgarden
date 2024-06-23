'use client'
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react'
import { toast } from 'sonner';

export default function AccountSuccessPage() {
    const router = useRouter();
    const [isButtonVisible, setIsButtonVisible] = useState<boolean>(false);

    useEffect(() => {

        const fetchUser = async () => {
            const response = await fetch('/api/user');
            const data = await response.json();

            if (data.user) {
                const user = data.user;
                const response = await fetch('/api/users', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ user }),
                });
                if (response.ok) {
                    router.push('/forum');
                }
                else {
                    toast.error('Something went wrong, please click on Redirect to go back to the forum')
                }

            } else {
                console.error('Error fetching profile:', data.error);
            }
        };


        fetchUser();
    }, []);
    return (
        <>
            <div className='w-screen h-screen flex flex-col items-center justify-center bg-gradient-to-r from-black to-red-500'>
                <h1 className='text-white text-center text-3xl'>Success</h1>
                <p className='text-white text-center text-lg'>Your account has been successfully created ! <br />You will be redirected in a moment...</p>
                {isButtonVisible && (<Link href={'/forum'} className='underline text-white hover:text-blue-500'>Redirect</Link>)}
            </div>
        </>
    )
}
