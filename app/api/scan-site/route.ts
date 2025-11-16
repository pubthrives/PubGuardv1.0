// app/api/scan-site/route.ts
import axios from "axios";
import OpenAI from "openai";
import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import https from "https";
import * as cheerio from "cheerio";

/* ---------------- CONFIG ---------------- */
const FETCH_TIMEOUT = 20000;
const MAX_PAGES = 500;
const CONCURRENCY = 12;
const REQUIRED_PAGES = ["about", "contact", "privacy", "terms", "disclaimer"];
const MIN_CONTENT_WORDS = 300;
const OPENAI_KEY: string | undefined = process.env.OPENAI_API_KEY;

function getOpenAIClient() {
  if (!OPENAI_KEY) return null;
  try {
    return new OpenAI({ apiKey: OPENAI_KEY });
  } catch (e) {
    console.error("OpenAI init failed:", e);
    return null;
  }
}

/* ----------------- UTIL: Logging helpers ----------------- */
function now() {
  return new Date().toISOString();
}
function info(...args: any[]) {
  console.log("[INFO]", now(), ...args);
}
function warn(...args: any[]) {
  console.warn("[WARN]", now(), ...args);
}
function errorLog(...args: any[]) {
  console.error("[ERROR]", now(), ...args);
}

/* ---------------- HELPERS ---------------- */

async function fetchHTML(url: string): Promise<string> {
  info("Fetching:", url);
  try {
    const res = await axios.get(url, {
      timeout: FETCH_TIMEOUT,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      },
      httpsAgent: new https.Agent({ rejectUnauthorized: false }),
      maxRedirects: 5,
    });

    if (!res || !res.data) {
      warn("Empty response for URL:", url);
      return "";
    }

    const html = typeof res.data === "string" ? res.data : String(res.data);
    info(`Fetched ${url} (${html.length} chars)`);
    return html;
  } catch (err: any) {
    warn(`Failed to fetch ${url}:`, err?.message || err);
    return "";
  }
}

function extractLinks(html: string, baseUrl: string): string[] {
  const $ = cheerio.load(html || "");
  const baseHost = new URL(baseUrl).hostname;
  const links = new Set<string>();

  $("a[href]").each((_, el) => {
    const href = $(el).attr("href");
    if (!href) return;
    if (href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return;

    try {
      const full = new URL(href, baseUrl).href;
      const host = new URL(full).hostname;

      if (host !== baseHost) return;

      if (full.match(/\.(jpg|jpeg|png|gif|svg|pdf|zip|mp4|mp3|ico|css|js)$/i)) return;
      if (full.includes("?replytocom=")) return;

      links.add(full);
    } catch (e) {}
  });

  info(`Extracted ${links.size} links from ${baseUrl}`);
  return Array.from(links);
}

/* ---------------- SMART URL FILTER ---------------- */

function isLikelyPostUrl(url: string): boolean {
  try {
    const lower = url.toLowerCase();
    const u = new URL(lower);
    const path = u.pathname;
    const segments = path.split("/").filter(Boolean);

    // Skip all non-content pages first
    const skipPatterns = [
      "/wp-json/",
      "/wp-content/",
      "/wp-includes/",
      "/admin/",
      "/login",
      "/register",
      "/signup",
      "/cart",
      "/checkout",
      "/feed",
      "/contact",
      "/about",
      "/privacy",
      "/terms",
      "/disclaimer",
      "/support",
      "/help",
      "/faq",
      "/sitemap",
      "/robots.txt",
      "/humans.txt",
      // Skip category/tag/archive pages
      "/category/",
      "/tag/",
      "/author/",
      "/archive/",
      "/search/",
      "/page/", // Pagination
      "/year/", // Yearly archives
      "/month/", // Monthly archives
      "/day/", // Daily archives
    ];
    if (skipPatterns.some((p) => path.includes(p))) return false;

    // Allow tool/download pages for analysis (safety)
    const toolKeywords = [
      "download", "torrent", "crack", "keygen", "serial", "hack", "patch", "activation", "apk",
      "video-downloader", "youtube-downloader", "tiktok-downloader", "instagram-downloader"
    ];
    if (toolKeywords.some(k => path.includes(k))) return true;

    // Pattern: /YYYY/MM/slug.html (blog post format)
    if (/^\/\d{4}\/\d{2}\/[^\/]+\.html?$/i.test(path)) return true;

    // Pattern: /YYYY/MM/slug (blog post format without extension)
    if (/^\/\d{4}\/\d{2}\/[^\/]+$/i.test(path) && segments.length === 3) return true;

    // Pattern: /category/slug (but we already excluded /category/ above)
    // So if it's not in skipPatterns, and has more than 2 segments with descriptive last segment, it might be content
    if (segments.length >= 2) {
      const lastSegment = segments[segments.length - 1];
      // Check if last segment looks like a content slug (not a category/tag name)
      if (
        lastSegment.length > 4 && 
        !/^\d+$/.test(lastSegment) && // Not just numbers
        !/^(page|category|tag|feed|year|month|day|archive|search|author)$/.test(lastSegment) && // Not archive/structure
        !lastSegment.includes('?') && // No query params
        !lastSegment.includes('#') // No fragments
      ) {
        return true;
      }
    }

    // Single segment pages (but not required static pages, already excluded)
    if (segments.length === 1) {
      // If it's not in REQUIRED_PAGES (already filtered out), and it's descriptive, consider it content
      const singleSegment = segments[0];
      if (!REQUIRED_PAGES.includes(singleSegment)) {
        // For example: /services/, /portfolio/, /blog/, etc.
        // Only if it's not an obvious category
        if (!['category', 'tag', 'author', 'archive', 'search'].includes(singleSegment)) {
          return true;
        }
      }
    }

    // Default: not a content post
    return false;
  } catch (e) {
    return false;
  }
}

function checkRequiredPages(allLinks: string[]): { found: string[]; missing: string[] } {
  const found: string[] = [];
  const missing: string[] = [];

  for (const p of REQUIRED_PAGES) {
    const match = allLinks.find(l => l.toLowerCase().includes(p));
    if (match) found.push(p);
    else missing.push(p);
  }

  return { found, missing };
}

/* ---------------- CONTENT QUALITY CHECKS ---------------- */

function isSafeContent(text: string, urlPath: string): boolean {
  const lower = (text || "").toLowerCase();

  const toolKeywords = [
    'download', 'torrent', 'crack', 'keygen', 'serial', 'hack', 'patch', 'activation',
    'free-download', 'apk', 'video-downloader'
  ];
  if (toolKeywords.some(k => urlPath.includes(k))) {
    return false;
  }

  const safeIndicators = ["how to", "tutorial", "guide", "tips", "review", "recipe", "news"];
  const dangerIndicators = ["casino", "betting", "porn", "scam", "fake download", "get rich", "miracle"];

  if (dangerIndicators.some(d => lower.includes(d))) return false;
  if (safeIndicators.some(s => lower.includes(s))) return true;

  return false;
}

function analyzeContentQuality($: cheerio.Root, url: string) {
  const body = $("main, article, .post-content, .entry-content, .content, .post-body, body").text() || "";
  const words = body.trim().split(/\s+/).filter(Boolean).length;
  const issues: string[] = [];
  if (words < MIN_CONTENT_WORDS) issues.push(`Thin content (${words} words < ${MIN_CONTENT_WORDS})`);

  const h1 = $("h1").length;
  const h2 = $("h2").length;
  const h3 = $("h3").length;
  const hasProperHeadings = h1 > 0 && (h2 > 0 || h3 > 0);
  if (!hasProperHeadings) issues.push("Missing proper heading hierarchy (H1/H2/H3)");

  return { issues, wordCount: words, hasProperHeadings };
}

/* ---------------- DUPLICATE CHECK ---------------- */

function checkForDuplicateContent(content: string, existing: string[]): boolean {
  const normalized = (content || "").toLowerCase().replace(/\s+/g, " ").trim();
  for (const ex of existing) {
    const normEx = ex.toLowerCase().replace(/\s+/g, " ").trim();
    const minLen = Math.min(normalized.length, normEx.length);
    if (minLen < 100) continue;
    let matches = 0;
    const step = Math.max(1, Math.floor(minLen / 100));
    for (let i = 0; i < minLen; i += step) {
      if (normalized[i] === normEx[i]) matches++;
    }
    const ratio = matches / Math.ceil(minLen / step);
    if (ratio > 0.85) return true;
  }
  return false;
}

/* ---------------- CLEAR VIOLATION DETECTION ---------------- */

function detectClearViolations($: cheerio.Root, url: string): any[] {
  const violations: any[] = [];
  const bodyText = $("body").text().toLowerCase();

  const clearPhrases = [
    "cracked software", "torrent download", "download full movie", "get rich quick",
    "make money fast", "free iphone", "download crack", "serial key", "keygen",
    "casino", "betting", "porn", "xxx", "nude", "scam", "fake download", "miracle cure"
  ];

  for (const p of clearPhrases) {
    if (bodyText.includes(p)) {
      violations.push({ type: "PolicyViolation", excerpt: `Phrase: ${p}`, confidence: 0.95 });
    }
  }

  $("a[href]").each((_, el) => {
    const href = $(el).attr("href") || "";
    const text = $(el).text().toLowerCase();
    if ((href.includes("torrent") || text.includes("torrent") || href.includes("crack") || text.includes("crack")) &&
        (text.includes("download") || text.includes("full") || text.includes("software") || text.includes("movie"))) {
      violations.push({ type: "Copyright", excerpt: `Illegal download link: ${text}`, confidence: 0.9 });
    }
  });

  const bodyLower = $("body").text().toLowerCase();
  const affiliateSelectors = ['a[href*="amazon.com/dp/"]', 'a[href*="clickbank.net/"]', 'a[href*="shareasale.com/"]'];
  for (const sel of affiliateSelectors) {
    try {
      $(sel).each((_, el) => {
        const href = $(el).attr("href") || "";
        if (href) {
          if (!bodyLower.includes("affiliate") && !bodyLower.includes("sponsored") && !bodyLower.includes("disclosure")) {
            violations.push({ type: "AffiliateDisclosure", excerpt: `Affiliate link without disclosure: ${href}`, confidence: 0.85 });
          }
        }
      });
    } catch {}
  }

  const adCount = $('iframe[src*="doubleclick"], iframe[src*="googlesyndication"], .adsbygoogle, .ad-container').length;
  if (adCount > 10) {
    violations.push({ type: "ExcessiveAds", excerpt: `High ad density (${adCount})`, confidence: 0.8 });
  }

  return violations;
}

/* ---------------- OPENAI ANALYSIS ---------------- */

async function analyzeTextWithAI(text: string, url: string = "", context: string = ""): Promise<any> {
  const client = getOpenAIClient();
  if (!client) {
    warn("OpenAI client not available; skipping AI analysis.");
    return { violations: [], summary: "OpenAI unavailable", suggestions: [] };
  }

  try {
    const urlPath = new URL(url).pathname;
    if (isSafeContent(text, urlPath)) {
      info("Pre-filter safe content; skipping AI:", url);
      return { violations: [], summary: "Safe content pre-filter", suggestions: [] };
    }
  } catch {}

  try {
    info("Calling OpenAI for URL:", url);
    const start = Date.now();

    const res = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.1,
      max_tokens: 1200,
      messages: [
        {
          role: "system",
          content: `
You are a strict AdSense policy auditor. ONLY return valid JSON.
Return:
{ "violations": [ { "type": "PolicyViolation|Copyright|Adult|Gambling|Scam|...etc", "excerpt":"...", "confidence": 0.95 } ], "summary": "", "suggestions": [] }
Be conservative and ONLY flag clear violations.
`
        },
        {
          role: "user",
          content: `URL: ${url}\nCONTEXT: ${context}\n\nCONTENT:\n${text.slice(0, 16000)}`
        }
      ],
    });

    const end = Date.now();
    info(`OpenAI response time for ${url}: ${end - start}ms`);

    const choice = res?.choices?.[0];
    const message = choice?.message?.content || "";
    const cleaned = message.replace(/```json|```/gi, "").trim();
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) {
      warn("OpenAI did not return JSON for:", url);
      return { violations: [], summary: "AI no JSON", suggestions: [] };
    }
    const parsed = JSON.parse(match[0]);

    parsed.violations = Array.isArray(parsed.violations) ? parsed.violations : [];
    parsed.suggestions = Array.isArray(parsed.suggestions) ? parsed.suggestions : [];

    parsed.violations = parsed.violations.filter((v: any) => (v.confidence || 0) >= 0.8);

    return parsed;
  } catch (err: any) {
    errorLog("AI analysis failed for", url, err?.message || err);
    return { violations: [], summary: "AI error", suggestions: [] };
  }
}

/* ------------------------------------------------------------------ */
/* ------------------------ MAIN SCAN FUNCTION ----------------------- */
/* ------------------------------------------------------------------ */

async function scanSite(url: string) {
  const startTime = Date.now();
  info("Starting scan for:", url);

  try {
    new URL(url);
  } catch (e) {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  const homepageHtml = await fetchHTML(url);
  if (!homepageHtml) {
    return NextResponse.json({ error: "Failed to fetch homepage" }, { status: 500 });
  }

  const allLinks = extractLinks(homepageHtml, url);
  const { found, missing } = checkRequiredPages(allLinks);
  info(`Required pages found: ${found.length}, missing: ${missing.length}`);

  let crawlSet = new Set(allLinks.slice(0, 100));
  crawlSet.add(url);

  const toExpand = Array.from(crawlSet).slice(0, 20);
  await Promise.all(toExpand.map(async link => {
    if (crawlSet.size > MAX_PAGES) return;
    const h = await fetchHTML(link);
    if (!h) return;
    extractLinks(h, url).forEach(l => {
      if (crawlSet.size < MAX_PAGES) crawlSet.add(l);
    });
  }));
  info(`Crawl completed. Unique pages discovered: ${crawlSet.size}`);

  const candidates = Array.from(crawlSet)
    .filter(isLikelyPostUrl)
    .map(u => u.split('#')[0]);
  const uniqueCandidates = Array.from(new Set(candidates));
  info(`Candidate posts for scanning: ${uniqueCandidates.length}`);

  // Analyze homepage (only for structure, not policy/dupes)
  const $home = cheerio.load(homepageHtml);
  const homepageQuality = analyzeContentQuality($home, url);
  const homepageViolations = detectClearViolations($home, url);
  const homepageTitle = $home("title").text().trim();
  const homepageH1 = $home("h1").first().text().trim();
  const homepageMeta = $home("meta[name='description']").attr("content") || "";
  const homepageBody = $home("body").text().replace(/\s+/g, " ").slice(0, 16000);
  const homepageContext = `TITLE: ${homepageTitle}\nH1: ${homepageH1}\nMETA: ${homepageMeta}\nCONTENT: ${homepageBody}`.slice(0, 16000);
  const homepageAI = await analyzeTextWithAI(homepageContext, url, "Homepage");

  if (homepageViolations.length > 0) {
    homepageAI.violations = [...(homepageAI.violations || []), ...homepageViolations];
    homepageAI.summary = homepageAI.summary || "Potential issues detected on homepage";
  }

  // Analyze POSTS only (skip static pages)
  const pagesWithIssues: any[] = [];
  const seenContents: string[] = [];
  let duplicatePostCount = 0;
  let policyViolationCount = 0;

  for (let i = 0; i < uniqueCandidates.length; i += CONCURRENCY) {
    const batch = uniqueCandidates.slice(i, i + CONCURRENCY);
    info(`Processing batch ${Math.floor(i / CONCURRENCY) + 1}/${Math.ceil(uniqueCandidates.length / CONCURRENCY)}`);

    await Promise.all(batch.map(async (p) => {
      info("Fetching post:", p);
      const html = await fetchHTML(p);
      if (!html) return;

      const $p = cheerio.load(html);
      const quality = analyzeContentQuality($p, p);
      const clear = detectClearViolations($p, p);

      const bodyText = $p("main, article, .post-content, .entry-content, .content, .post-body")
        .text()
        .replace(/\s+/g, " ")
        .trim();

      if (bodyText.length < 200) return;

      if (checkForDuplicateContent(bodyText, seenContents)) {
        duplicatePostCount++;
        pagesWithIssues.push({
          url: p,
          violations: [{ type: "DuplicateContent", excerpt: "Likely duplicate content", confidence: 0.9 }],
          summary: "Duplicate content",
          qualityIssues: quality.issues
        });
        return;
      }
      seenContents.push(bodyText);

      const title = $p("title").text().trim();
      const h1 = $p("h1").first().text().trim();
      const meta = $p("meta[name='description']").attr("content") || "";
      const fullContext = `TITLE: ${title}\nH1: ${h1}\nMETA: ${meta}\nCONTENT: ${bodyText}`.slice(0, 16000);
      const aiRes = await analyzeTextWithAI(fullContext, p, "Post");

      if (clear.length > 0) {
        aiRes.violations = [...(aiRes.violations || []), ...clear];
      }

      const hasIssues = (aiRes.violations && aiRes.violations.length > 0) || (aiRes.suggestions?.length > 0) || (quality.issues?.length > 0);
      if (hasIssues) {
        // Count policy violations (exclude DuplicateContent)
        const policyViolations = (aiRes.violations || []).filter((v: any) => v.type !== "DuplicateContent");
        policyViolationCount += policyViolations.length;

        pagesWithIssues.push({
          url: p,
          violations: aiRes.violations || [],
          suggestions: aiRes.suggestions || [],
          summary: aiRes.summary || "",
          qualityIssues: quality.issues.length ? quality.issues : undefined
        });
      }
    }));
  }

  // === SCORING LOGIC ===
  let score = 100;

  // Policy violations: -5 points each
  score -= policyViolationCount * 5;

  // Duplicate content: -1 point each (only on posts)
  score -= duplicatePostCount * 1;

  // Required pages missing: -5 each
  score -= missing.length * 5;

  // Homepage quality: -2 per issue
  score -= (homepageQuality.issues.length || 0) * 2;

  // Content volume penalty
  if (uniqueCandidates.length < 20) score -= 10;
  else if (uniqueCandidates.length < 40) score -= 5;

  score = Math.max(0, Math.min(100, Math.round(score)));

  const aiSuggestions = [
    ...(homepageAI.suggestions || []),
    ...pagesWithIssues.flatMap(p => p.suggestions || [])
  ];
  if (missing.length > 0) aiSuggestions.push(`Add missing pages: ${missing.join(", ")}`);
  if (homepageQuality.issues.length > 0) aiSuggestions.push(...homepageQuality.issues);

  const totalViolations = policyViolationCount + duplicatePostCount;

  const result: any = {
    url,
    totalViolations,
    policyViolations: policyViolationCount,
    duplicateContentPages: duplicatePostCount,
    requiredPages: { found, missing },
    siteStructure: {
      postCount: uniqueCandidates.length,
      hasMetaTags: !!$home("meta[name='description']").length,
      hasGoodHeaders: homepageQuality.hasProperHeadings,
      homepageQuality: homepageQuality,
      structureWarnings: [
        !$home("meta[name='description']").length ? "Missing homepage meta description" : null,
        !homepageQuality.hasProperHeadings ? "Missing proper header structure" : null
      ].filter(Boolean)
    },
    contentQuality: {
      totalPostsAnalyzed: uniqueCandidates.length,
      postsWithIssues: pagesWithIssues.length
    },
    pagesWithIssues,
    aiSuggestions: aiSuggestions.slice(0, 20),
    score,
    summary: totalViolations > 0 
      ? `${policyViolationCount} policy violations and ${duplicatePostCount} duplicate pages found` 
      : (uniqueCandidates.length < 20 ? `Low content (${uniqueCandidates.length} posts)` : "Site appears compliant"),
    scannedAt: new Date().toISOString(),
    durationMs: Date.now() - startTime
  };

  info("Scan complete:", url, "Score:", score, "Policy Violations:", policyViolationCount, "Duplicates:", duplicatePostCount);
  return NextResponse.json(result);
}

/* ------------------------------------------------------------------ */
/* --------------------------- VERIFY SCRIPT ------------------------- */
/* ------------------------------------------------------------------ */

async function verifyScript(url: string) {
  info("Verifying script presence for:", url);
  try {
    const res = await fetch(url, { method: "GET", headers: { "User-Agent": "PolicyGuard/1.0" } });
    const html = await res.text();
    const found = html.includes("bootbot") || html.includes("cdn.bardnative.com/bootbot") || html.includes("bardnative.com/bootbot");
    return NextResponse.json({ found, url });
  } catch (err: any) {
    errorLog("Verification failed:", err?.message || err);
    return NextResponse.json({ error: "Verification failed", message: err?.message || String(err) }, { status: 500 });
  }
}

/* ------------------------------------------------------------------ */
/* -------------------------- ROUTE HANDLERS ------------------------- */
/* ------------------------------------------------------------------ */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const url: string = (body && body.url) ? String(body.url).trim() : "";
    const action: string = (body && body.action) ? String(body.action).trim() : "scan-site";

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    if (action === "verify-script") {
      return await verifyScript(url);
    }

    return await scanSite(url);
  } catch (err: any) {
    errorLog("POST handler error:", err?.message || err);
    return NextResponse.json({ error: "Internal server error", message: err?.message || String(err) }, { status: 500 });
  }
}

export async function GET() {
  const hasOpenAI = !!OPENAI_KEY;
  let openaiOk = false;
  if (hasOpenAI) {
    try {
      const client = getOpenAIClient();
      if (client) openaiOk = true;
    } catch (e) {
      openaiOk = false;
    }
  }

  return NextResponse.json({
    status: "ok",
    hasOpenAI,
    openaiOk,
    timestamp: new Date().toISOString(),
    service: "PolicyGuard Scan API"
  });
}