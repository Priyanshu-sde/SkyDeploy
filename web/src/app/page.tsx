"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useSession } from "next-auth/react";
import { useEffect } from "react";

const sampleSites = [
  { name: "Blog by Alice", url: "https://alice.skydeploy.priyanshu.com" },
  { name: "Dev Portfolio", url: "https://dev.skydeploy.priyanshu.com" },
  { name: "Shop Demo", url: "https://shop.skydeploy.priyanshu.com" },
];

export default function LandingPage() {
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === "authenticated") {
      window.location.href = "/home";
    }
  }, [status]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-background to-muted px-4 py-12">
      <div className="w-full max-w-2xl mx-auto text-center mb-12">
        <h1 className="text-5xl font-extrabold mb-4 tracking-tight bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-600 bg-clip-text text-transparent">SkyDeploy</h1>
        <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
          Effortless static site hosting. Deploy your projects in seconds and see what others have built.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
          <Button asChild size="lg" className="text-base font-semibold px-8 py-2">
            <a href="/signup">Get Started</a>
          </Button>
          <Button asChild variant="outline" size="lg" className="text-base font-semibold px-8 py-2">
            <a href="/login">Login</a>
          </Button>
        </div>
      </div>
      <div className="w-full max-w-3xl mx-auto grid gap-8 grid-cols-1 md:grid-cols-3">
        {sampleSites.map(site => (
          <Card key={site.url} className="border shadow-md hover:shadow-xl transition-shadow duration-200">
            <CardHeader>
              <CardTitle className="truncate">{site.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <a href={site.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline break-all text-sm">
                {site.url}
              </a>
            </CardContent>
          </Card>
        ))}
      </div>
      <footer className="mt-16 text-xs text-muted-foreground text-center opacity-80">
        &copy; {new Date().getFullYear()} SkyDeploy. All rights reserved.
      </footer>
    </div>
  );
}
