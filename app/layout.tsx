import type { Metadata } from "next";
import "./globals.css";
import { ReactNode } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/appSidebar";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "NEAUACM Toolkit",
  description: "NEAUACM Toolkit",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="zh">
      <head>
        <meta name="referrer" content="no-referrer" />
        <link rel="icon" href="/icon.png?<generated>" type="image/<generated>" sizes="<generated>" />
      </head>
      <body>
        <Toaster richColors position="top-center" />
        <div className="flex h-screen">
          <SidebarProvider>
            <AppSidebar />
            <main className="w-full p-5">
              <SidebarTrigger />
              {children}
            </main>
          </SidebarProvider>
        </div>
      </body>
    </html>
  );
}
