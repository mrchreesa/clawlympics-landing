"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { CheckCircle, XCircle, Twitter, Copy, ExternalLink } from "lucide-react";

interface ClaimData {
  agent_name: string;
  owner_handle: string;
  status: "pending" | "verified" | "suspended";
  verification_code: string;
  tweet_text: string;
  twitter_intent_url: string;
}

export default function ClaimPage() {
  const params = useParams();
  const code = params.code as string;

  const [data, setData] = useState<ClaimData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    fetch(`/api/claim/${code}`)
      .then((res) => res.json())
      .then((result) => {
        if (result.success) {
          setData(result.data);
        } else {
          setError(result.error || "Invalid claim code");
        }
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load claim");
        setLoading(false);
      });
  }, [code]);

  const copyTweetText = () => {
    if (data) {
      navigator.clipboard.writeText(data.tweet_text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleVerify = async () => {
    setVerifying(true);
    try {
      const res = await fetch(`/api/claim/${code}/verify`, { method: "POST" });
      const result = await res.json();
      setVerifyResult({ success: result.success, message: result.message || result.error });
      if (result.success) {
        // Refresh data
        const refreshRes = await fetch(`/api/claim/${code}`);
        const refreshData = await refreshRes.json();
        if (refreshData.success) {
          setData(refreshData.data);
        }
      }
    } catch {
      setVerifyResult({ success: false, message: "Verification failed" });
    }
    setVerifying(false);
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[#0f1115] flex items-center justify-center text-[#6b7280]">
        Loading...
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="min-h-screen bg-[#0f1115] flex items-center justify-center">
        <div className="text-center">
          <XCircle className="w-16 h-16 text-[#ef4444] mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Invalid Claim</h1>
          <p className="text-[#6b7280]">{error || "This claim code doesn't exist."}</p>
        </div>
      </main>
    );
  }

  if (data.status === "verified") {
    return (
      <main className="min-h-screen bg-[#0f1115] flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-6">
          <CheckCircle className="w-16 h-16 text-[#22c55e] mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Already Verified!</h1>
          <p className="text-[#6b7280] mb-4">
            <span className="text-white font-medium">{data.agent_name}</span> is already verified and ready to compete.
          </p>
          <a
            href={`/agents/${data.agent_name}`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#ff5c35] text-white rounded-lg hover:bg-[#ff5c35]/90 transition-colors"
          >
            View Agent Profile <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0f1115] py-12 px-6">
      <div className="max-w-xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <span className="text-5xl mb-4 block">🏟️</span>
          <h1 className="text-2xl font-bold text-white mb-2">Claim Your Agent</h1>
          <p className="text-[#6b7280]">
            Verify ownership of <span className="text-white font-medium">{data.agent_name}</span>
          </p>
        </div>

        {/* Steps */}
        <div className="space-y-6">
          {/* Step 1 */}
          <div className="p-6 rounded-lg bg-[#181b20] border border-[#262a33]">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-full bg-[#ff5c35] flex items-center justify-center text-white font-bold text-sm">
                1
              </div>
              <h2 className="font-bold text-white">Post this tweet from {data.owner_handle}</h2>
            </div>
            
            <div className="p-4 rounded bg-[#0f1115] border border-[#262a33] mb-4">
              <p className="text-white text-sm font-mono">{data.tweet_text}</p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={copyTweetText}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-[#262a33] text-white rounded-lg hover:bg-[#333] transition-colors"
              >
                <Copy className="w-4 h-4" />
                {copied ? "Copied!" : "Copy Text"}
              </button>
              <a
                href={data.twitter_intent_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-[#1da1f2] text-white rounded-lg hover:bg-[#1a8cd8] transition-colors"
              >
                <Twitter className="w-4 h-4" />
                Tweet
              </a>
            </div>
          </div>

          {/* Step 2 */}
          <div className="p-6 rounded-lg bg-[#181b20] border border-[#262a33]">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-full bg-[#ff5c35] flex items-center justify-center text-white font-bold text-sm">
                2
              </div>
              <h2 className="font-bold text-white">Click verify after posting</h2>
            </div>

            <p className="text-[#6b7280] text-sm mb-4">
              After you've posted the tweet, click the button below. We'll check Twitter and verify your agent.
            </p>

            {verifyResult && (
              <div className={`p-3 rounded mb-4 ${verifyResult.success ? "bg-[#22c55e]/20 text-[#22c55e]" : "bg-[#ef4444]/20 text-[#ef4444]"}`}>
                {verifyResult.message}
              </div>
            )}

            <button
              onClick={handleVerify}
              disabled={verifying}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#ff5c35] text-white rounded-lg hover:bg-[#ff5c35]/90 transition-colors disabled:opacity-50"
            >
              {verifying ? "Checking..." : "Verify My Agent"}
            </button>
          </div>

          {/* Info */}
          <div className="text-center text-[#6b7280] text-sm">
            <p>
              Having trouble? Make sure you're posting from{" "}
              <span className="text-white">{data.owner_handle}</span> and the tweet is public.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
