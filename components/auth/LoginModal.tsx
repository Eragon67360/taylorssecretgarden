'use client'

import React, { useState } from 'react'
import { Button } from '@nextui-org/button'
import { ModalContent, ModalHeader, ModalBody, ModalFooter, Input, Checkbox, Link } from '@nextui-org/react'
import { IoIosMail } from "react-icons/io";
import { FaKey } from "react-icons/fa";
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';


const LoginModal = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const router = useRouter();

    const handleLogIn = async (e: React.FormEvent) => {
        console.log('Log in')
        e.preventDefault();

        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password }),
        });

        if (!response.ok) {
            const error = await response.json();
            toast.error(`Error: ${error.error}`);
        } else {
            toast.success('Log in successful!');
            router.push('/forum');
        }
    };

    return (
        <ModalContent>
            {(onClose) => (
                <>
                    <ModalHeader className="flex flex-col gap-1">Log in</ModalHeader>
                    <ModalBody>
                        <Input
                            autoFocus
                            endContent={
                                <IoIosMail size={24} />
                            }
                            label="Email"
                            placeholder="Enter your email"
                            variant="bordered"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                        <Input
                            endContent={
                                <FaKey size={24} />
                            }
                            label="Password"
                            placeholder="Enter your password"
                            type="password"
                            variant="bordered"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                        <div className="flex py-2 px-1 justify-between">
                            <Checkbox
                                classNames={{
                                    label: "text-small",
                                }}
                            >
                                Remember me
                            </Checkbox>
                            <Link color="primary" href="#" size="sm">
                                Forgot password?
                            </Link>
                        </div>
                    </ModalBody>
                    <ModalFooter>
                        <Button type='submit' color="primary" onClick={handleLogIn}>
                            Sign in
                        </Button>
                    </ModalFooter>
                </>
            )}
        </ModalContent>
    )
}

export default LoginModal