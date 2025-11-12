// app/page.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  CheckCircle,
  ShieldCheck,
  Globe,
  ArrowRight,
  Sparkles,
  Play,
  TrendingUp,
  BarChart3,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";

// ---------- TYPES ----------
type Stats = {
  totalSites: number;
  lastScan: string | null;
  violationsFound: number;
  systemStatus: string;
  requiredPages: { found: string[]; missing: string[] };
  siteStructure: {
    postCount: number;
    hasMetaTags: boolean;
    hasGoodHeaders: boolean;
  };
};

// ---------- COMPONENT ----------
export default function OverviewPage() {
  const [stats, setStats] = useState<Stats>({
    totalSites: 0,
    lastScan: null,
    violationsFound: 0,
    systemStatus: "operational",
    requiredPages: { found: [], missing: [] },
    siteStructure: {
      postCount: 0,
      hasMetaTags: false,
      hasGoodHeaders: false,
    },
  });

  const [loading, setLoading] = useState(true);

  // Load dashboard stats
  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        const storedViolations = localStorage.getItem("guardian_violations");
        if (storedViolations) {
          const violations = JSON.parse(storedViolations);
          setStats((prev) => ({
            ...prev,
            totalSites: violations.length,
            lastScan:
              violations.length > 0
                ? violations[violations.length - 1].scannedAt
                : null,
            violationsFound: violations.reduce(
              (sum: number, v: any) => sum + (v.totalViolations || 0),
              0
            ),
            systemStatus: "operational",
          }));
        } else {
          setStats((prev) => ({
            ...prev,
            totalSites: 0,
            lastScan: null,
            violationsFound: 0,
            systemStatus: "operational",
          }));
        }
      } catch (error) {
        console.error("Failed to load stats:", error);
        toast.error("Failed to load dashboard stats.");
        setStats((prev) => ({
          ...prev,
          systemStatus: "error",
        }));
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  // ---------- SCORE CALCULATION ----------
  const calculateOverallScore = (): number => {
    if (stats.systemStatus === "error") return 0;
    let score = 100;
    score -= Math.min(50, stats.violationsFound * 2);
    score -= stats.requiredPages.missing.length * 5;
    score -= stats.siteStructure.postCount < 20 ? 10 : 0;
    if (!stats.siteStructure.hasMetaTags) score -= 5;
    if (!stats.siteStructure.hasGoodHeaders) score -= 5;
    return Math.max(0, Math.min(100, Math.round(score)));
  };

  const overallScore = calculateOverallScore();

  const safeSuggestions = [
    ...(stats.violationsFound > 0
      ? ["Address policy violations found in scanned sites."]
      : []),
    ...(stats.requiredPages.missing.length
      ? [`Add missing pages: ${stats.requiredPages.missing.join(", ")}`]
      : []),
    ...(stats.siteStructure.postCount < 40
      ? ["Increase content volume for better compliance."]
      : []),
    "Review AdSense program policies regularly.",
    "Ensure transparent affiliate link disclosures.",
  ];

  // ---------- LOADING STATE ----------
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // ---------- MAIN RENDER ----------
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Toaster position="top-right" />
      <div className="max-w-7xl mx-auto px-6 py-8">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="space-y-10"
        >
          {/* HERO */}
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="text-center mb-8"
          >
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 mb-4">
              <ShieldCheck className="text-white" size={28} />
            </div>
            <motion.h1
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.3 }}
              className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 tracking-tight"
            >
              PolicyGuard<span className="text-blue-600">.</span>
            </motion.h1>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto leading-relaxed">
              AI-powered compliance scanning. Identify policy violations and
              optimize your sites for AdSense approval.
            </p>
          </motion.div>

          {/* CTA CARDS */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-8"
          >
            <Link href="/sites">
              <motion.div
                whileHover={{ y: -8 }}
                className="bg-gradient-to-br from-white to-gray-50/50 rounded-3xl border border-gray-200/50 p-8 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer group overflow-hidden relative"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                <div className="relative z-10">
                  <div className="flex items-start gap-4 mb-6">
                    <div className="p-3 bg-blue-100 rounded-xl group-hover:bg-blue-200 transition-colors duration-300">
                      <Globe className="text-blue-600" size={24} />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 mb-2">
                        Scan Your Sites
                      </h2>
                      <p className="text-gray-600 mb-4">
                        Discover potential AdSense policy issues across your
                        website network instantly.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center text-blue-600 font-medium group-hover:text-blue-700 transition-colors">
                    Start Scanning{" "}
                    <ArrowRight
                      className="ml-2 transition-transform group-hover:translate-x-1"
                      size={18}
                    />
                  </div>
                </div>
              </motion.div>
            </Link>

            <Link href="/violations">
              <motion.div
                whileHover={{ y: -8 }}
                className="bg-gradient-to-br from-white to-gray-50/50 rounded-3xl border border-gray-200/50 p-8 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer group overflow-hidden relative"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-red-500/5 to-orange-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                <div className="relative z-10">
                  <div className="flex items-start gap-4 mb-6">
                    <div className="p-3 bg-red-100 rounded-xl group-hover:bg-red-200 transition-colors duration-300">
                      <AlertTriangle className="text-red-600" size={24} />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 mb-2">
                        View Violations
                      </h2>
                      <p className="text-gray-600 mb-4">
                        Get detailed reports on all detected policy breaches and
                        AI-driven solutions.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center text-red-600 font-medium group-hover:text-red-700 transition-colors">
                    View Reports{" "}
                    <ArrowRight
                      className="ml-2 transition-transform group-hover:translate-x-1"
                      size={18}
                    />
                  </div>
                </div>
              </motion.div>
            </Link>
          </motion.div>

          {/* DASHBOARD */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {/* System Status */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/60 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 rounded-xl bg-green-100">
                  <CheckCircle className="text-green-600" size={20} />
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-500">
                    System Status
                  </div>
                  <p className="text-2xl font-semibold text-gray-900">
                    {stats.systemStatus}
                  </p>
                </div>
              </div>
              <p className="text-xs text-gray-400">All systems operational</p>
            </div>

            {/* Sites Scanned */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/60 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 rounded-xl bg-blue-100">
                  <Globe className="text-blue-600" size={20} />
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-500">
                    Sites Scanned
                  </div>
                  <p className="text-2xl font-semibold text-gray-900">
                    {stats.totalSites}
                  </p>
                </div>
              </div>
              <p className="text-xs text-gray-400">Monitored pages</p>
            </div>

            {/* Issues Found */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/60 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 rounded-xl bg-red-100">
                  <AlertTriangle className="text-red-600" size={20} />
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-500">
                    Issues Found
                  </div>
                  <p className="text-2xl font-semibold text-gray-900">
                    {stats.violationsFound}
                  </p>
                </div>
              </div>
              <p className="text-xs text-gray-400">Policy violations</p>
            </div>

            {/* Overall Score */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/60 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 rounded-xl bg-indigo-100">
                  <BarChart3 className="text-indigo-600" size={20} />
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-500">
                    Overall Score
                  </div>
                  <p className="text-2xl font-semibold text-gray-900">
                    {overallScore}/100
                  </p>
                </div>
              </div>
              <p className="text-xs text-gray-400">Based on analysis</p>
            </div>
          </motion.div>

          {/* QUICK START */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
            className="bg-white/70 backdrop-blur-sm rounded-3xl border border-gray-200/50 p-8 shadow-sm mt-4"
          >
            <div className="flex items-center gap-2 mb-6">
              <Sparkles className="text-indigo-500" size={20} />
              <h3 className="text-xl font-semibold text-gray-900">
                Quick Start Guide
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  icon: Play,
                  title: "Add Sites",
                  desc: "Input your website URLs to begin monitoring.",
                },
                {
                  icon: ShieldCheck,
                  title: "Run Analysis",
                  desc: "Our AI scans for AdSense policy compliance.",
                },
                {
                  icon: TrendingUp,
                  title: "Improve Scores",
                  desc: "Implement suggestions to enhance approval chances.",
                },
              ].map((step, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * index }}
                  className="text-center p-6 rounded-2xl bg-gray-50/50 border border-gray-100 hover:bg-gray-100/50 transition-colors"
                >
                  <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center mx-auto mb-4">
                    <step.icon className="text-indigo-600" size={24} />
                  </div>
                  <h4 className="font-semibold text-gray-900 mb-2">
                    {step.title}
                  </h4>
                  <p className="text-sm text-gray-600">{step.desc}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* AI RECOMMENDATIONS */}
          {safeSuggestions.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.4 }}
              className="bg-indigo-50/70 backdrop-blur-sm rounded-3xl border border-indigo-200/50 p-6"
            >
              <div className="flex items-center gap-2 mb-4">
                <ShieldCheck className="text-indigo-600" size={20} />
                <h3 className="text-lg font-semibold text-gray-900">
                  AI Recommendations
                </h3>
              </div>
              <ul className="list-disc list-inside text-gray-700 text-sm space-y-1">
                {safeSuggestions.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
}