'use client'

import React, { FC, useState } from 'react'
import { Button } from '@nextui-org/button'
import { ModalContent, ModalHeader, ModalBody, ModalFooter, Input, Checkbox, Link } from '@nextui-org/react'
import { IoIosMail } from "react-icons/io";
import { useRouter } from 'next/navigation';
import { FaRegEyeSlash, FaRegEye } from "react-icons/fa";
import { toast } from 'sonner';

type LoginModalProps = {
    onClose: () => void;
}

const LoginModal: FC<LoginModalProps> = ({ onClose }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const router = useRouter();
    const [isVisible, setIsVisible] = useState(false);
    const toggleVisibility = () => setIsVisible(!isVisible);

    const handleLogIn = async (e: React.FormEvent) => {
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
            onClose();
        }
    };

    return (
        <ModalContent>
            {(onClose) => (
                <>
                    <ModalHeader className="flex flex-col gap-1">Log in</ModalHeader>
                    <ModalBody>
                        <Input                        
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
                                <button className="focus:outline-none" type="button" onClick={toggleVisibility}>
                                    {isVisible ? (
                                        <FaRegEyeSlash size={24} />
                                    ) : (
                                        <FaRegEye size={24} />
                                    )}
                                </button>
                            }
                            label="Password"
                            type={isVisible ? "text" : "password"}
                            placeholder="Enter your password"
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