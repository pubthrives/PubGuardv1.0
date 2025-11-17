"use client";

import { useState } from "react";
import { Copy, Globe, RefreshCw, Loader2, Shield, Zap, Check, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import toast, { Toaster } from "react-hot-toast";

export default function IVTBlockerPage() {
    const [siteUrl, setSiteUrl] = useState("");
    const [generatedScript, setGeneratedScript] = useState("");
    const [isCopied, setIsCopied] = useState(false);
    const [verificationStatus, setVerificationStatus] =
        useState<null | "loading" | "success" | "error">(null);
    const [lastVerifiedSite, setLastVerifiedSite] = useState<string | null>(null);
    const [isVerifying, setIsVerifying] = useState(false);

    const generateScript = () => {
        if (!siteUrl.trim()) {
            toast.error("Please enter a valid site URL");
            return;
        }

        const scriptCode = `<script type=\"module\" src=\"https://cdn.bardnative.com/bootbot/v1/index.min.js\"></script>

<script async src=\"https://securepubads.g.doubleclick.net/tag/js/gpt.js\"></script>

<script>
  window.googletag = window.googletag || { cmd: [] };

  window.googletag.cmd.push(() => {
    window.bootbot.then(res => {
      if (res.bot) {
        console.debug(\"BOT BLOCKED — no ad request sent\");
        return;
      }

      googletag.pubads().setTargeting(\"ivtb\", \"0\");
      googletag.enableServices();
      googletag.display(\"div-gpt-ad-123\");
    });
  });
</script>`;

        setGeneratedScript(scriptCode);
        toast.success("Script generated successfully!");
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(generatedScript);
        setIsCopied(true);
        toast.success("Script copied to clipboard!");
        setTimeout(() => setIsCopied(false), 2000);
    };

    const verifyScriptPlacement = async () => {
        if (!siteUrl.trim()) {
            toast.error("Please enter a site URL to verify");
            return;
        }

        setIsVerifying(true);
        setVerificationStatus("loading");
        setLastVerifiedSite(siteUrl);

        try {
            const response = await fetch("/api/scan-site", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    url: siteUrl,
                    action: "verify-script",
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Verification failed");
            }

            if (data.found) {
                setVerificationStatus("success");
                toast.success("Script found on site!");
            } else {
                setVerificationStatus("error");
                toast.error("Script not found on site");
            }
        } catch (err) {
            setVerificationStatus("error");
            toast.error("Verification failed - please check the URL or try again");
            console.error("Verification error:", err);
        } finally {
            setIsVerifying(false);
        }
    };

    const resetVerification = () => {
        setVerificationStatus(null);
        setLastVerifiedSite(null);
    };

    return (
        <div className="min-h-screen bg-gray-50 text-gray-900">
            <Toaster position="top-right" />

            <div className="max-w-4xl mx-auto px-6 py-8">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-8"
                >
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 mb-4">
                        <Shield className="text-blue-600" size={24} />
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900">IVT Blocker</h1>
                    <p className="text-gray-500 mt-2">Block invalid traffic and protect your ad revenue</p>
                </motion.div>

                {/* Main Card */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6"
                >
                    <div className="flex items-center gap-3 mb-6">
                        <Globe className="text-blue-600" size={20} />
                        <h2 className="text-xl font-semibold text-gray-900">Add Site for IVT Protection</h2>
                    </div>

                    <div className="space-y-6">
                        {/* URL Input */}
                        <div>
                            <label htmlFor="siteUrl" className="block text-sm font-medium text-gray-700 mb-2">
                                Website URL
                            </label>
                            <div className="flex gap-3">
                                <input
                                    type="url"
                                    id="siteUrl"
                                    value={siteUrl}
                                    onChange={(e) => setSiteUrl(e.target.value)}
                                    placeholder="https://example.com"
                                    className="flex-1 border border-gray-300 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                                    disabled={isVerifying}
                                />
                                <motion.button
                                    whileTap={{ scale: 0.98 }}
                                    onClick={generateScript}
                                    disabled={!siteUrl.trim() || isVerifying}
                                    className={`px-6 py-3 rounded-lg text-sm font-medium transition ${siteUrl.trim() && !isVerifying
                                        ? "bg-blue-600 text-white hover:bg-blue-700"
                                        : "bg-gray-100 text-gray-400 cursor-not-allowed"
                                        }`}
                                >
                                    <div className="flex items-center gap-2">
                                        <Zap size={16} />
                                        Generate Script
                                    </div>
                                </motion.button>
                            </div>
                        </div>

                        {/* Actions */}
                        {generatedScript && (
                            <div className="flex flex-col sm:flex-row gap-3">
                                <motion.button
                                    whileTap={{ scale: 0.98 }}
                                    onClick={verifyScriptPlacement}
                                    disabled={isVerifying}
                                    className={`py-3 px-6 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition ${isVerifying
                                        ? "bg-gray-100 text-gray-400 cursor-wait"
                                        : "bg-green-600 text-white hover:bg-green-700"
                                        }`}
                                >
                                    {isVerifying ? (
                                        <>
                                            <Loader2 className="animate-spin" size={16} />
                                            Verifying...
                                        </>
                                    ) : (
                                        <>
                                            <RefreshCw size={16} />
                                            Verify Script Placement
                                        </>
                                    )}
                                </motion.button>

                                <motion.button
                                    whileTap={{ scale: 0.98 }}
                                    onClick={copyToClipboard}
                                    className={`py-3 px-6 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition ${isCopied
                                        ? "bg-green-100 text-green-700"
                                        : "bg-blue-600 text-white hover:bg-blue-700"
                                        }`}
                                >
                                    <Copy size={16} />
                                    {isCopied ? "Copied!" : "Copy Script"}
                                </motion.button>
                            </div>
                        )}

                        {/* Verification Status */}
                        <AnimatePresence>
                            {verificationStatus && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className={`p-4 rounded-lg border ${verificationStatus === "success"
                                        ? "bg-green-50 border-green-200"
                                        : verificationStatus === "error"
                                            ? "bg-red-50 border-red-200"
                                            : "bg-blue-50 border-blue-200"
                                        }`}
                                >
                                    <div className="flex items-start gap-3">
                                        <div
                                            className={`w-8 h-8 rounded-full flex items-center justify-center ${verificationStatus === "success"
                                                ? "bg-green-100 text-green-600"
                                                : verificationStatus === "error"
                                                    ? "bg-red-100 text-red-600"
                                                    : "bg-blue-100 text-blue-600"
                                                }`}
                                        >
                                            {verificationStatus === "loading" && (
                                                <Loader2 className="animate-spin" size={16} />
                                            )}
                                            {verificationStatus === "success" && <Check size={16} />}
                                            {verificationStatus === "error" && <AlertTriangle size={16} />}
                                        </div>

                                        <div className="flex-1">
                                            <p
                                                className={`font-medium ${verificationStatus === "success"
                                                    ? "text-green-800"
                                                    : verificationStatus === "error"
                                                        ? "text-red-800"
                                                        : "text-blue-800"
                                                    }`}
                                            >
                                                {verificationStatus === "success"
                                                    ? "✓ Script detected successfully!"
                                                    : verificationStatus === "error"
                                                        ? "⚠️ Script not found on site"
                                                        : "🔍 Checking script placement..."}
                                            </p>

                                            {lastVerifiedSite && (
                                                <p className="text-sm text-gray-600 mt-1">
                                                    Checked:{" "}
                                                    <span className="font-mono">{lastVerifiedSite}</span>
                                                </p>
                                            )}

                                            {verificationStatus === "error" && (
                                                <div className="mt-2 text-sm text-gray-600">
                                                    Make sure you&apos;ve pasted the script in the{" "}
                                                    <code className="bg-gray-100 px-1 rounded text-xs">
                                                        &lt;head&gt;
                                                    </code>{" "}
                                                    section of your site.
                                                    <button
                                                        onClick={resetVerification}
                                                        className="text-blue-600 hover:text-blue-800 underline ml-1"
                                                    >
                                                        Try again
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </motion.div>

                {/* Generated Script */}
                <AnimatePresence>
                    {generatedScript && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
                        >
                            <div className="flex items-center gap-3 mb-6">
                                <Zap className="text-green-600" size={20} />
                                <h2 className="text-xl font-semibold text-gray-900">
                                    Generated IVT Blocker Script
                                </h2>
                            </div>

                            <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto mb-4">
                                <pre className="text-sm text-green-400 whitespace-pre-wrap font-mono">
                                    {generatedScript.split("\n").map((line, i) => (
                                        <div key={i} className="flex">
                                            <span className="text-gray-500 text-right w-8 mr-3 select-none">
                                                {i + 1}
                                            </span>
                                            <span className="flex-1">{line}</span>
                                        </div>
                                    ))}
                                </pre>
                            </div>

                            <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                                <h3 className="font-medium text-blue-800 mb-2">
                                    Installation Instructions:
                                </h3>
                                <ol className="list-decimal list-inside space-y-1 text-blue-700 text-sm">
                                    <li>Copy the script above using the &quot;Copy Script&quot; button</li>
                                    <li>
                                        Paste it in the{" "}
                                        <code className="bg-blue-100 px-1 rounded text-xs">
                                            &lt;head&gt;
                                        </code>{" "}
                                        section of your website
                                    </li>
                                    <li>
                                        Replace{" "}
                                        <code className="bg-blue-100 px-1 rounded text-xs">
                                            &quot;div-gpt-ad-123&quot;
                                        </code>{" "}
                                        with your actual ad unit ID
                                    </li>
                                    <li>
                                        Use the &quot;Verify Script Placement&quot; button to confirm
                                        installation
                                    </li>
                                </ol>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}