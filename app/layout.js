import { Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/header";
import Image from "next/image";
import { ConvexClientProvider } from "@/components/convex-client-provider";
import { ClerkProvider } from "@clerk/nextjs";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "SplitR",
  description: "The most Intellegent way to split finances ",
};

export default function RootLayout({ children }) {
  return (
        <ClerkProvider> 
        <ConvexClientProvider>
    <html lang="en">
      <head>
        <link rel="icon" href="/logos/SplitR%20logos/logo-s.png" sizes="any" />
      </head>
      <body className={`${inter.className}`}>

          <Header />

          <main className="min-h-screen">{children}</main>
      </body>
    </html>
        </ConvexClientProvider>
        </ClerkProvider>
  );
}
