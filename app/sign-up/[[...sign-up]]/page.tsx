import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
    return (
        <>
            <div className="w-screen h-screen flex items-center justify-center bg-gradient-to-r from-[#5eadd7] to-[#ffa7b3]">
                <SignUp forceRedirectUrl={'/account-succesfully-created'}/>
            </div>
        </>
    );
}