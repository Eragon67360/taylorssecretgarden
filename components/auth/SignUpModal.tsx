"use client"

import React, { useEffect, useMemo, useState } from "react"
import { ModalContent, ModalHeader, ModalBody, ModalFooter, Input, Checkbox, Link } from "@nextui-org/react"
import { IoIosMail } from "react-icons/io";

import { IoPersonSharp } from "react-icons/io5";
import { MdAlternateEmail } from "react-icons/md";
import { useRouter } from "next/navigation";
import { FaRegEyeSlash, FaRegEye } from "react-icons/fa";
import { toast } from "sonner";


const SignUpModal = () => {

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState<string>('');
    const [fullName, setFullName] = useState('');
    const [pseudonym, setPseudonym] = useState('');
    const [isVisible, setIsVisible] = useState(false);
    const [isFormValid, setIsFormValid] = useState(false);
    const router = useRouter();


    const toggleVisibility = () => setIsVisible(!isVisible);

    const validateEmail = (value: string) => value.match(/^[A-Z0-9._%+-]+@[A-Z0-9.-]+.[A-Z]{2,4}$/i);
    const isEmailInvalid = useMemo(() => {
        if (email === "") return false;

        return validateEmail(email) ? false : true;
    }, [email]);

    const isPasswordInvalid = useMemo(() => {
        return password.length < 6;
    }, [password]);


    const validateForm = () => {
        const isNameValid = fullName.trim() !== '';
        const isPseudoValid = pseudonym.trim() !== '';


        setIsFormValid(!isEmailInvalid && !isPasswordInvalid && isNameValid && isPseudoValid);
    };

    useEffect(() => {
        validateForm();
    }, [email, password, fullName, pseudonym]);

    const handleSignUp = async (e: React.FormEvent) => {
        e.preventDefault();

        const response = await fetch('/api/auth/signup', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password, full_name: fullName, pseudonym }),
        });

        if (!response.ok) {
            const error = await response.json();
            toast.error(`Error: ${error.error}`);
        } else {
            toast.success('Sign up successful!');
            router.push('/forum');
        }
    };
    return (
        <ModalContent>
            {(onClose) => (
                <>
                    <ModalHeader className="flex flex-col gap-1">Create an account</ModalHeader>
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
                            isInvalid={isEmailInvalid}
                            color={isEmailInvalid ? "danger" : "success"}
                            errorMessage="Please enter a valid email"
                            isRequired
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
                            placeholder="Enter your password"
                            type={isVisible ? "text" : "password"}
                            variant="bordered"
                            value={password}
                            isInvalid={isPasswordInvalid}
                            errorMessage="Password should have 6 characters min."
                            onChange={(e) => setPassword(e.target.value)}
                            isRequired
                        />
                        <Input
                            endContent={
                                <IoPersonSharp size={24} />
                            }
                            label="Name"
                            placeholder="Full Name"
                            variant="bordered"
                            type="text"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            isRequired
                        />
                        <Input
                            endContent={
                                <MdAlternateEmail size={24} />
                            }
                            label="Pseudonym"
                            placeholder="Your pseudo"
                            variant="bordered"
                            type="text"
                            value={pseudonym}
                            onChange={(e) => setPseudonym(e.target.value)}
                            isRequired
                        />

                    </ModalBody>
                    <ModalFooter>
                        <button type='submit' onClick={handleSignUp} disabled={!isFormValid} className='bg-primary text-white rounded-xl px-3 py-2 disabled:bg-gray-300'>
                            Create account
                        </button>
                    </ModalFooter>
                </>
            )}
        </ModalContent>
    )
}

export default SignUpModal