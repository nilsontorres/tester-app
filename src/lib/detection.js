export const categorizeRequest = (userAgent="", headers={}) => {
    const ua = String(userAgent || "").toLowerCase();

    const normalizedHeaders = Object.fromEntries(
        Object.entries(headers || {}).map(([k, v]) => [
        String(k).toLowerCase(),
        String(v ?? "").toLowerCase()
        ])
    );

    const getHeader = (name) => normalizedHeaders[name.toLowerCase()] || "";

    const xRequestedWith = getHeader("x-requested-with");
    const hasGorgon = !!getHeader("x-gorgon");
    const hasKhronos = !!getHeader("x-khronos");
    const hasTtTrace = !!getHeader("x-tt-trace-id");
    const hasTtProxy = !!getHeader("x-tt-web-proxy");
    const hasOecSdk = !!getHeader("oec-vc-sdk-version") || !!getHeader("oec-cs-sdk-version");

    // ----------------------------
    // 1) BOT: crawlers / scrapers
    // ----------------------------
    const botUaPatterns = [
        /facebookexternalhit/,
        /\bfacebot\b/,
        /\btwitterbot\b/,
        /\bslackbot\b/,
        /\bdiscordbot\b/,
        /\blinkedinbot\b/,
        /\bwhatsapp\b.*\bpreview\b/,
        /\bskypeuripreview\b/,
        /\btelegrambot\b/,
        /\bgooglebot\b/,
        /\bbingbot\b/,
        /\bduckduckbot\b/,
        /\byandex(bot)?\b/,
        /\bbaiduspider\b/,
        /\bsemrushbot\b/,
        /\bahrefsbot\b/,
        /\bapplebot\b/,
        /\bcrawler\b/,
        /\bspider\b/,
        /\bscrapy\b/,
        /\bheadlesschrome\b/,
        /\bphantomjs\b/,
        /\bselenium\b/,
        /\bplaywright\b/,
        /\bpuppeteer\b/
    ];

    if (botUaPatterns.some((re) => re.test(ua))) {
        return {
        category: "bot",
        confidence: "high",
        reason: "bot/crawler token found in user-agent"
        };
    }

    // -------------------------------------------------
    // 2) REVIEW: revisão / QA / teste humano do TikTok
    // -------------------------------------------------
    const reviewUaPatterns = [
        /\bchannel\/inhouse\b/,
        /\bchannel\/local_test\b/,
        /\binhouse\/1\b/,
        /\bappname\/trill\b/,
        /\btrill[_/]/,
        /\bthirdlandingpagefeinfra\b/,
        /\bbullet\/1\b/,
        /\bhybridtag\//,
        /\bfalcontag\//
    ];

    const reviewHeaderSignals = [
        hasTtTrace,
        hasTtProxy,
        hasOecSdk
    ].filter(Boolean).length;

    if (reviewUaPatterns.some((re) => re.test(ua))) {
        return {
        category: "review",
        confidence: "high",
        reason: "internal/inhouse/local_test/trill pattern found"
        };
    }

    // Regra opcional: se o tráfego tiver cara de stack interna ByteDance/TikTok,
    // mas não parecer app público comum, classificar como review.
    const looksInternalTikTok =
        (ua.includes("bytedancewebview") || ua.includes("trill")) &&
        (hasTtTrace || hasTtProxy || hasOecSdk);

    if (looksInternalTikTok && !ua.includes("channel/app store") && !ua.includes("channel/googleplay") && !ua.includes("channel/release")) {
        return {
        category: "review",
        confidence: "medium",
        reason: "internal ByteDance/TikTok test stack markers"
        };
    }

    // ---------------------------------------------
    // 3) USER: usuário real no app TikTok/TikTok Go
    // ---------------------------------------------
    const userUaPatterns = [
        /\bappname\/ultralite\b/,
        /\bappname\/musical_ly\b/,
        /\bmusical_ly[_/]/,
        /\bchannel\/app store\b/,
        /\bchannel\/googleplay\b/,
        /\bchannel\/release\b/,
        /\bapp_version\//,
        /\bregion\/[a-z]{2}\b/,
        /\bbytelocale\//,
        /\bbytefulllocale\//
    ];

    const userHeaderSignals = [
        xRequestedWith === "com.zhiliaoapp.musically",
        xRequestedWith === "com.zhiliaoapp.musically.go",
        hasGorgon,
        hasKhronos,
        hasTtTrace,
        hasTtProxy,
        hasOecSdk
    ].filter(Boolean).length;

    if (userUaPatterns.some((re) => re.test(ua))) {
        return {
        category: "user",
        confidence: userHeaderSignals >= 1 ? "high" : "medium",
        reason: "public TikTok/TikTok Lite app pattern found"
        };
    }

    if (xRequestedWith === "com.zhiliaoapp.musically" || xRequestedWith === "com.zhiliaoapp.musically.go") {
        return {
        category: "user",
        confidence: "high",
        reason: "TikTok Android app package header found"
        };
    }

    // -------------------------------------------------
    // 4) Fallback:
    // - se parece navegador comum -> user
    // - se não parece nada comum -> bot
    // -------------------------------------------------
    const looksLikeNormalBrowser =
        /mozilla\/5\.0/.test(ua) &&
        (
        ua.includes("chrome/") ||
        ua.includes("safari/") ||
        ua.includes("applewebkit/") ||
        ua.includes("wkwebview")
        );

    if (looksLikeNormalBrowser) {
        return {
        category: "user",
        confidence: "low",
        reason: "normal browser/webview fallback"
        };
    }

    return {
        category: "bot",
        confidence: "low",
        reason: "unknown non-user pattern fallback"
    };
}