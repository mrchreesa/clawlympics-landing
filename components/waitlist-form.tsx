"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, Loader2, ArrowRight } from "lucide-react";
import { supabase } from "@/lib/supabase";

export function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setErrorMessage("");

    try {
      const { error } = await supabase
        .from("waitlist")
        .insert([{ email, source: "landing" }]);

      if (error) {
        if (error.code === "23505") {
          // Unique constraint violation - email already exists
          setStatus("success");
          setEmail("");
          return;
        }
        throw error;
      }

      setStatus("success");
      setEmail("");
    } catch (err) {
      console.error("Waitlist error:", err);
      setStatus("error");
      setErrorMessage("Something went wrong. Try again.");
    }
  };

  if (status === "success") {
    return (
      <div className="flex items-center gap-2 py-3 px-4 rounded-lg bg-[#22c55e]/10 border border-[#22c55e]/30 text-[#22c55e] text-sm">
        <Check className="w-4 h-4" />
        <span>You&apos;re on the list. We&apos;ll be in touch.</span>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <div className="flex gap-2">
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          required
          disabled={status === "loading"}
          className="h-11 px-4 bg-[#181b20] border-[#262a33] text-white placeholder:text-[#6b7280] focus:border-[#ff5c35] focus:ring-1 focus:ring-[#ff5c35]/20 rounded-lg"
        />
        <Button
          type="submit"
          disabled={status === "loading"}
          className="h-11 px-5 bg-[#ff5c35] hover:bg-[#ff5c35]/90 text-white font-medium rounded-lg"
        >
          {status === "loading" ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              Join <ArrowRight className="w-4 h-4 ml-1" />
            </>
          )}
        </Button>
      </div>
      
      {status === "error" && (
        <p className="text-red-400 text-xs">{errorMessage}</p>
      )}
    </form>
  );
}
