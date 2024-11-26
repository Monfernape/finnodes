import React from "react";
import Image from "next/image";
import { LoginForm } from "./components/LoginForm";

const LoginPage = () => {
  return (
    <div className="flex min-h-screen">
      {/* Left column - Aesthetic side */}
      <div className="hidden w-1/2 bg-gray-900 lg:block">
        <div className="relative h-full w-full">
          <Image
            src="/placeholder.svg?height=1080&width=1080"
            alt="Decorative background"
            layout="fill"
            objectFit="cover"
            priority
          />
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <h1 className="text-4xl font-bold text-white text-center">
              Welcome to Finnodes
            </h1>
          </div>
        </div>
      </div>

      {/* Right column - GitHub auth flow */}
      <div className="w-full lg:w-1/2 flex items-center justify-center bg-gray-100 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md">
          <LoginForm />
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
