//to use hoooks this must be added at top
"use client";

import { useStoreUser } from "@/hooks/use-store-user";
import {
  SignedIn,
  SignedOut,
  SignInButton,
  SignUpButton,
  UserButton,
} from "@clerk/nextjs";
import React from "react";
import { BarLoader } from "react-spinners";

const Header = () => {
  const { isLoading } = useStoreUser();
  return (
    <header className="fixed top-0 w-full border-b bg-white/95 backdrop-blur z-50 supports-[backdrop-filter]:bg-white/60">
      <nav>
        <SignedOut>
          <SignInButton />
          <SignUpButton />
        </SignedOut>
        <SignedIn>
          <UserButton />
        </SignedIn>
      </nav>


      {isLoading && <BarLoader width={'100%'} color="#36d7b7"/>}
    </header>
  );
};

export default Header;
