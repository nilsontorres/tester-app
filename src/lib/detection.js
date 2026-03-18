/**
 * Classifica tráfego TikTok em:
 * - "user": usuário real
 * - "review": revisão / QA / teste / tráfego interno TikTok
 * - "bot": bot / crawler / preview
 *
 * Regras:
 * - usa apenas user-agent + headers
 * - não depende de query string
 */
export const classifyTraffic = (userAgent, headers={}) => {
    const ua = String(userAgent || "").trim();
    const uaLc = ua.toLowerCase();
    const h = normalizeHeaders(headers);

    const secFetchDest = h["sec-fetch-dest"] || "";
    const secFetchMode = h["sec-fetch-mode"] || "";
    const secFetchUser = h["sec-fetch-user"] || "";
    const referer = h["referer"] || "";
    const xRequestedWith = h["x-requested-with"] || "";
    const pathname = h[":path"] || h["x-pathname"] || h["pathname"] || "";

    const isTikTokAndroidPackage = /com\.zhiliaoapp\.musically(\.go)?/i.test(xRequestedWith);

    const hasTikTokIOSHeaders =
        !!h["x-gorgon"] ||
        !!h["x-khronos"] ||
        !!h["x-tt-trace-id"] ||
        !!h["x-tt-web-proxy"] ||
        !!h["x-tt-request-tag"];

    const hasTikTokExtraHeaders =
        hasTikTokIOSHeaders ||
        !!h["oec-vc-sdk-version"] ||
        !!h["oec-cs-sdk-version"] ||
        !!h["rpc-persist-pyxis-policy-v-tnc"] ||
        !!h["x-bd-kmsv"];

    const isMainDocumentRequest =
        secFetchDest.toLowerCase() === "document" &&
        secFetchMode.toLowerCase() === "navigate";

    const isSubresourceRequest =
        secFetchDest.toLowerCase() === "image" ||
        pathname.endsWith("/favicon.ico") ||
        pathname.endsWith("/apple-touch-icon.png") ||
        pathname.endsWith("/apple-touch-icon-precomposed.png");

    const hasTikTokReferer = /https?:\/\/(www\.)?tiktok\.com/i.test(referer);

    const isExplicitBotUA =
        /facebookexternalhit|facebot|twitterbot|bot|crawler|spider/i.test(uaLc);

    const isAppleNetworkingUA =
        /com\.apple\.webkit\.networking\//i.test(ua);

    const isInternalReviewUA =
        /thirdlandingpagefeinfra|channel\/local_test|channel\/inhouse|\binhouse\/1\b|\btrill_/i.test(uaLc);

    const isTikTokAppUA =
        /musical_ly|appname\/musical_ly|appname\/ultralite|bytedancewebview|wkwebview|android webview|; wv\)/i.test(uaLc);

    const isUserLikeTikTokUA =
        /musical_ly|appname\/musical_ly|appname\/ultralite|bytedancewebview/i.test(uaLc);

    const isSuspiciousGenericDesktopUA =
        /windows nt|macintosh/i.test(uaLc) &&
        !isExplicitBotUA &&
        !isTikTokAndroidPackage &&
        !hasTikTokIOSHeaders &&
        !hasTikTokReferer;

    // 1) BOT
    if (isExplicitBotUA) {
        return "bot";
    }

    if (isAppleNetworkingUA && isSubresourceRequest && !hasTikTokExtraHeaders) {
        return "bot";
    }

    // 2) REVIEW
    if (isInternalReviewUA) {
        return "review";
    }

    if (isSuspiciousGenericDesktopUA) {
        return "review";
    }

    if (/chrome\/117/i.test(uaLc) && /windows nt/i.test(uaLc) && !hasTikTokExtraHeaders && !hasTikTokReferer) {
        return "review";
    }

    // Caso tipo TikTok, mas sem sinais de clique real e com cara de ambiente controlado
    if (/bytemod|tiktok-as-ap|bytedance/i.test([h["x-forwarded-for"], h["x-real-ip"], h["forwarded"], ua].join(" ")) && /windows nt/i.test(uaLc)) {
        return "review";
    }

    // 3) USER
    if (isUserLikeTikTokUA && (isTikTokAndroidPackage || hasTikTokIOSHeaders || hasTikTokReferer) && (isMainDocumentRequest || isSubresourceRequest)) {
        return "user";
    }

    if (isTikTokAndroidPackage && /android webview|; wv\)|appname\/ultralite/i.test(uaLc)) {
        return "user";
    }

    if (hasTikTokIOSHeaders && /iphone|ipad|musical_ly|wkwebview/i.test(uaLc)) {
        return "user";
    }

    if (isMainDocumentRequest && secFetchUser === "?1" && isTikTokAppUA && (isTikTokAndroidPackage || hasTikTokIOSHeaders || hasTikTokReferer)) {
        return "user";
    }

    if (isSubresourceRequest && isTikTokAppUA && (isTikTokAndroidPackage || hasTikTokIOSHeaders || hasTikTokReferer)) {
        return "user";
    }

    // 4) fallback
    if (isTikTokAppUA || hasTikTokExtraHeaders) {
        return "review";
    }

    return "bot";
}
  
function normalizeHeaders(headers) {
    const out = {};
    for (const [key, value] of Object.entries(headers || {})) {
        out[String(key).toLowerCase()] = Array.isArray(value)
        ? value.join(", ")
        : String(value ?? "");
    }
    return out;
}