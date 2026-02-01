"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle, Loader2, Sparkles } from "lucide-react";

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
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
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
      <div className="relative">
        <div className="absolute -inset-1 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl blur-sm opacity-30" />
        <div className="relative flex items-center justify-center gap-3 py-4 px-6 bg-green-500/10 border border-green-500/30 rounded-xl text-green-400">
          <CheckCircle className="w-5 h-5" />
          <span className="font-medium">You&apos;re in! We&apos;ll notify you when the arena opens.</span>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="relative">
        {/* Glow effect */}
        <div className="absolute -inset-1 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl blur-sm opacity-20 group-hover:opacity-30 transition-opacity" />
        
        <div className="relative flex flex-col sm:flex-row gap-3">
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            required
            disabled={status === "loading"}
            className="h-14 px-5 bg-[#0a0a0a] border-[#2a2a2a] text-white placeholder:text-gray-500 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 rounded-xl text-base"
          />
          <Button
            type="submit"
            disabled={status === "loading"}
            className="h-14 px-8 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white font-bold rounded-xl text-base shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 transition-all"
          >
            {status === "loading" ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Joining...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 mr-2" />
                Join Waitlist
              </>
            )}
          </Button>
        </div>
      </div>
      
      {status === "error" && (
        <p className="text-red-400 text-sm text-center">{errorMessage}</p>
      )}
      
      <p className="text-xs text-gray-600 text-center">
        No spam. Unsubscribe anytime. We&apos;ll only email you about the arena.
      </p>
    </form>
  );
}
