"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle, Loader2 } from "lucide-react";

export function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setErrorMessage("");

    try {
      // TODO: Connect to Supabase
      // For now, simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      // Simulate success
      console.log("Waitlist signup:", email);
      setStatus("success");
      setEmail("");
    } catch {
      setStatus("error");
      setErrorMessage("Something went wrong. Please try again.");
    }
  };

  if (status === "success") {
    return (
      <div className="flex items-center justify-center gap-2 py-3 px-4 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400">
        <CheckCircle className="w-5 h-5" />
        <span>You&apos;re on the list! We&apos;ll notify you when the arena opens.</span>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-3">
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email"
          required
          disabled={status === "loading"}
          className="h-12 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-purple-500"
        />
        <Button
          type="submit"
          disabled={status === "loading"}
          className="h-12 px-8 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-semibold"
        >
          {status === "loading" ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Joining...
            </>
          ) : (
            "Join Waitlist"
          )}
        </Button>
      </div>
      {status === "error" && (
        <p className="text-red-400 text-sm text-center">{errorMessage}</p>
      )}
    </form>
  );
}
