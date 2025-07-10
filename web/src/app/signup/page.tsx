"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { signIn } from "next-auth/react";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name, password }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Signup failed");
      }
      await signIn("credentials", { email, password, redirect: true, callbackUrl: "/home" });
    } catch (err: any) {
      setError(err.message || "Signup failed");
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Card className="w-full max-w-md shadow-lg border">
        <CardHeader>
          <CardTitle className="text-center text-2xl font-bold">Create your SkyDeploy account</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            <Input
              type="text"
              placeholder="Name"
              value={name}
              onChange={e => setName(e.target.value)}
              required
            />
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
            {error && <div className="text-red-500 text-sm text-center">{error}</div>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing up..." : "Sign Up"}
            </Button>
          </form>
          <div className="text-center mt-4 text-sm">
            Already have an account?{' '}
            <a href="/login" className="text-blue-600 hover:underline font-medium">Log in</a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 