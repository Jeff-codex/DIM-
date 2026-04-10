import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const baseArg = process.argv.find((arg) => arg.startsWith("--base-url="));
const modeArg = process.argv.find((arg) => arg.startsWith("--mode="));
const baseUrl = (baseArg?.split("=")[1] ?? "").replace(/\/$/, "");
const mode = modeArg?.split("=")[1] ?? "candidate";
const canonicalHost = "https://depthintelligence.kr";
const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

if (!baseUrl) {
  console.error("Missing --base-url=<url>");
  process.exit(1);
}

if (!["candidate", "production"].includes(mode)) {
  console.error("Invalid --mode value. Use candidate or production.");
  process.exit(1);
}

const shellRoutes = [
  "/",
  "/articles",
  "/about",
  "/submit",
];

function parseJsonFromStdout(rawOutput) {
  const trimmed = `${rawOutput ?? ""}`.trim();
  const jsonStart = trimmed.search(/^[\[{]/m);

  if (jsonStart === -1) {
    throw new Error(trimmed || "Missing JSON output");
  }

  return JSON.parse(trimmed.slice(jsonStart));
}

function loadSlugInventory() {
  const targetEnv = mode === "production" ? "production" : "production_candidate";
  const result = spawnSync(
    process.execPath,
    [
      "--experimental-strip-types",
      "./scripts/slug-audit.ts",
      "--mode",
      "inventory",
      "--env",
      targetEnv,
    ],
    {
      cwd: appRoot,
      encoding: "utf8",
    },
  );

  if (result.status !== 0) {
    const failureOutput = [result.stderr, result.stdout].filter(Boolean).join("\n");
    throw new Error(failureOutput || "slug_audit_inventory_failed");
  }

  return parseJsonFromStdout(result.stdout);
}

const slugInventory = loadSlugInventory();
const canonicalArticleRoute = slugInventory?.smokeSamples?.canonical?.route ?? null;
const aliasArticleRoute = slugInventory?.smokeSamples?.alias?.aliasRoute ?? null;
const aliasCanonicalRoute =
  slugInventory?.smokeSamples?.alias?.canonicalRoute ?? canonicalArticleRoute;
const canonicalSampleTitle = slugInventory?.smokeSamples?.canonical?.title ?? null;
const expectedCardImage =
  slugInventory?.smokeSamples?.canonical?.cardImage ??
  slugInventory?.smokeSamples?.canonical?.detailImage ??
  null;
const expectedDetailImage =
  slugInventory?.smokeSamples?.canonical?.detailImage ??
  slugInventory?.smokeSamples?.canonical?.cardImage ??
  null;
const expectedCoverAltText =
  slugInventory?.smokeSamples?.canonical?.coverImageAltText?.trim() ||
  canonicalSampleTitle ||
  null;

async function expectStatus(url, expected, options) {
  const response = await fetch(url, {
    redirect: "manual",
    ...options,
  });

  if (response.status !== expected) {
    const body = await response.text();
    throw new Error(`${url} expected ${expected} but received ${response.status}\n${body}`);
  }

  return response;
}

async function expectHtml(url, expectedStatus = 200) {
  const response = await expectStatus(url, expectedStatus);
  const html = await response.text();
  return { response, html };
}

function expectIncludes(haystack, needle, label) {
  if (!haystack.includes(needle)) {
    throw new Error(`Expected ${label} to include ${needle}`);
  }
}

function expectSingleCanonical(html, expectedHref, routeLabel) {
  const canonicalMatches = Array.from(
    html.matchAll(/<link rel="canonical" href="([^"]+)"/g),
  );

  if (canonicalMatches.length !== 1) {
    throw new Error(
      `${routeLabel} expected exactly 1 canonical link but found ${canonicalMatches.length}`,
    );
  }

  const href = canonicalMatches[0]?.[1] ?? "";

  if (href !== expectedHref) {
    throw new Error(
      `${routeLabel} expected canonical ${expectedHref} but received ${href}`,
    );
  }
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function decodeHtmlEntities(value) {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function normalizeText(value) {
  return decodeHtmlEntities(value).replace(/\s+/g, " ").trim();
}

function extractAttribute(tag, name) {
  const match = tag.match(new RegExp(`${name}="([^"]*)"`, "i"));
  return match?.[1] ?? null;
}

function extractMetaContent(html, property) {
  const regex = new RegExp(
    `<meta[^>]+property="${escapeRegExp(property)}"[^>]+content="([^"]*)"[^>]*>`,
    "i",
  );
  const directMatch = html.match(regex);

  if (directMatch?.[1]) {
    return decodeHtmlEntities(directMatch[1]);
  }

  const reverseRegex = new RegExp(
    `<meta[^>]+content="([^"]*)"[^>]+property="${escapeRegExp(property)}"[^>]*>`,
    "i",
  );
  const reverseMatch = html.match(reverseRegex);
  return reverseMatch?.[1] ? decodeHtmlEntities(reverseMatch[1]) : null;
}

function extractLinkedImage(html, route) {
  const anchorRegex = new RegExp(
    `<a[^>]+href="${escapeRegExp(route)}"[^>]*>([\\s\\S]*?)<\\/a>`,
    "i",
  );
  const anchorMatch = html.match(anchorRegex);

  if (!anchorMatch?.[1]) {
    throw new Error(`Expected /articles HTML to include anchor for ${route}`);
  }

  const imageMatch = anchorMatch[1].match(/<img\b[^>]*>/i);

  if (!imageMatch?.[0]) {
    throw new Error(`Expected /articles card for ${route} to include an image`);
  }

  const src = extractAttribute(imageMatch[0], "src");
  const alt = extractAttribute(imageMatch[0], "alt");

  if (!src) {
    throw new Error(`Expected /articles card image for ${route} to expose src`);
  }

  return {
    src: decodeHtmlEntities(src),
    alt: normalizeText(alt ?? ""),
  };
}

function extractFirstArticleImage(html, routeLabel) {
  const articleMatch = html.match(/<article[\s\S]*?<\/article>/i);

  if (!articleMatch?.[0]) {
    throw new Error(`Expected ${routeLabel} HTML to include an <article> block`);
  }

  const imageMatch = articleMatch[0].match(/<img\b[^>]*>/i);

  if (!imageMatch?.[0]) {
    throw new Error(`Expected ${routeLabel} article block to include a representative image`);
  }

  const src = extractAttribute(imageMatch[0], "src");
  const alt = extractAttribute(imageMatch[0], "alt");

  if (!src) {
    throw new Error(`Expected ${routeLabel} representative image to expose src`);
  }

  return {
    src: decodeHtmlEntities(src),
    alt: normalizeText(alt ?? ""),
  };
}

function toCanonicalAbsoluteUrl(src) {
  if (/^https?:\/\//i.test(src)) {
    return src;
  }

  if (!src.startsWith("/")) {
    return `${canonicalHost}/${src}`;
  }

  return `${canonicalHost}${src}`;
}

async function expectRouteStatuses() {
  for (const route of shellRoutes) {
    await expectStatus(`${baseUrl}${route}`, 200);
  }

  if (!canonicalArticleRoute) {
    if (mode === "production") {
      throw new Error("No authoritative canonical article route is available in production inventory");
    }

    return {
      status: "blocked",
      reason: "no_published_slug_sample_in_target_env",
    };
  }

  await expectStatus(`${baseUrl}${canonicalArticleRoute}`, 200);

  if (!aliasArticleRoute || !aliasCanonicalRoute) {
    if (mode === "production") {
      throw new Error("No authoritative alias article route is available in production inventory");
    }

    return {
      status: "partial",
      reason: "no_active_alias_slug_sample_in_target_env",
      canonicalRoute: canonicalArticleRoute,
    };
  }

  const aliasResponse = await expectStatus(`${baseUrl}${aliasArticleRoute}`, 308);
  const location = aliasResponse.headers.get("location") ?? "";

  if (location !== aliasCanonicalRoute) {
    throw new Error(
      `${baseUrl}${aliasArticleRoute} expected location ${aliasCanonicalRoute} but received ${location}`,
    );
  }

  return {
    status: "verified",
    canonicalRoute: canonicalArticleRoute,
    aliasRoute: aliasArticleRoute,
  };
}

async function expectRedirect(url, expectedLocation) {
  const response = await expectStatus(url, 308);
  const location = response.headers.get("location") ?? "";

  if (location !== expectedLocation) {
    throw new Error(`${url} expected location ${expectedLocation} but received ${location}`);
  }
}

async function verifyProductionHostCanonicalization() {
  if (mode !== "production") {
    return;
  }

  await expectRedirect("http://depthintelligence.kr/", `${canonicalHost}/`);
  await expectRedirect("http://www.depthintelligence.kr/", `${canonicalHost}/`);
  await expectRedirect("https://www.depthintelligence.kr/", `${canonicalHost}/`);
}

async function verifySeoSurface() {
  const articles = await expectHtml(`${baseUrl}/articles`);
  expectSingleCanonical(articles.html, `${canonicalHost}/articles`, "/articles");
  expectIncludes(
    articles.html,
    '"@type":"CollectionPage"',
    "/articles structured data",
  );
  expectIncludes(
    articles.html,
    '"@type":"BreadcrumbList"',
    "/articles structured data",
  );
  expectIncludes(
    articles.html,
    '"@type":"ItemList"',
    "/articles structured data",
  );

  const about = await expectHtml(`${baseUrl}/about`);
  expectSingleCanonical(about.html, `${canonicalHost}/about`, "/about");
  expectIncludes(
    about.html,
    '<meta property="og:title" content="소개 | DIM"',
    "/about og:title",
  );

  if (!canonicalArticleRoute) {
    if (mode === "production") {
      throw new Error("No authoritative canonical article route is available for SEO verification");
    }

    return {
      status: "blocked",
      reason: "no_published_slug_sample_in_target_env",
    };
  }

  const canonicalArticle = await expectHtml(`${baseUrl}${canonicalArticleRoute}`);
  expectSingleCanonical(
    canonicalArticle.html,
    `${canonicalHost}${canonicalArticleRoute}`,
    canonicalArticleRoute,
  );
  expectIncludes(
    canonicalArticle.html,
    '"@type":"BreadcrumbList"',
    `${canonicalArticleRoute} structured data`,
  );

  const archiveCardImage = extractLinkedImage(articles.html, canonicalArticleRoute);
  const detailImage = extractFirstArticleImage(canonicalArticle.html, canonicalArticleRoute);
  const ogImage = extractMetaContent(canonicalArticle.html, "og:image");
  const ogImageAlt = extractMetaContent(canonicalArticle.html, "og:image:alt");

  if (!archiveCardImage.alt) {
    throw new Error(`/articles card image alt is empty for ${canonicalArticleRoute}`);
  }

  if (!detailImage.alt) {
    throw new Error(`${canonicalArticleRoute} detail image alt is empty`);
  }

  if (!expectedCardImage || !expectedDetailImage || !expectedCoverAltText) {
    throw new Error(
      `${canonicalArticleRoute} inventory is missing expected card/detail/alt metadata`,
    );
  }

  if (archiveCardImage.src !== expectedCardImage) {
    throw new Error(
      `${canonicalArticleRoute} expected archive card image ${expectedCardImage} but received ${archiveCardImage.src}`,
    );
  }

  if (detailImage.src !== expectedDetailImage) {
    throw new Error(
      `${canonicalArticleRoute} expected detail image ${expectedDetailImage} but received ${detailImage.src}`,
    );
  }

  if (!ogImage) {
    throw new Error(`${canonicalArticleRoute} is missing og:image`);
  }

  if (!ogImageAlt) {
    throw new Error(`${canonicalArticleRoute} is missing og:image:alt`);
  }

  if (normalizeText(archiveCardImage.alt) !== normalizeText(detailImage.alt)) {
    throw new Error(
      `${canonicalArticleRoute} archive/detail alt mismatch: ${archiveCardImage.alt} vs ${detailImage.alt}`,
    );
  }

  if (normalizeText(detailImage.alt) !== normalizeText(expectedCoverAltText)) {
    throw new Error(
      `${canonicalArticleRoute} expected cover alt ${expectedCoverAltText} but received ${detailImage.alt}`,
    );
  }

  if (normalizeText(detailImage.alt) !== normalizeText(ogImageAlt)) {
    throw new Error(
      `${canonicalArticleRoute} detail/og:image:alt mismatch: ${detailImage.alt} vs ${ogImageAlt}`,
    );
  }

  const expectedOgImage = toCanonicalAbsoluteUrl(detailImage.src);

  if (ogImage !== expectedOgImage) {
    throw new Error(
      `${canonicalArticleRoute} expected og:image ${expectedOgImage} but received ${ogImage}`,
    );
  }

  return {
    status: "verified",
    canonicalRoute: canonicalArticleRoute,
    archiveCardImage,
    detailImage,
    ogImage,
    ogImageAlt,
  };
}

async function verifyPublicSubmitConfig() {
  const response = await expectStatus(`${baseUrl}/api/public-config/submit`, 200);
  const json = await response.json();

  if (!json?.ok) {
    throw new Error("Submit public config did not return ok=true");
  }

  if (!json.turnstileSiteKey) {
    throw new Error("Submit public config did not expose a Turnstile site key");
  }

  if (json.workflowEnv !== "editorial_production") {
    throw new Error(`Expected workflowEnv editorial_production but received ${json.workflowEnv}`);
  }

  return json;
}

async function verifySubmitProtection() {
  const noTokenResponse = await fetch(`${baseUrl}/api/proposals`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      schemaVersion: 1,
      projectName: `Protection smoke ${new Date().toISOString()}`,
      summary: "Candidate protection smoke",
      whyNow: "Validate production submit protection",
      locale: "ko-KR",
      references: [],
    }),
  });
  const noTokenJson = await noTokenResponse.json();

  if (noTokenResponse.status !== 400 || noTokenJson?.error !== "turnstile_required") {
    throw new Error(
      `Expected turnstile_required (400) but received ${noTokenResponse.status} ${JSON.stringify(noTokenJson)}`,
    );
  }

  const formData = new FormData();
  formData.set(
    "payload",
    JSON.stringify({
      schemaVersion: 1,
      projectName: `Protection smoke multipart ${new Date().toISOString()}`,
      summary: "Candidate protection smoke",
      whyNow: "Validate fake token rejection",
      locale: "ko-KR",
      references: [],
    }),
  );
  formData.set("cf-turnstile-response", "fake-token");

  const fakeTokenResponse = await fetch(`${baseUrl}/api/proposals`, {
    method: "POST",
    body: formData,
  });
  const fakeTokenJson = await fakeTokenResponse.json();

  if (fakeTokenResponse.status !== 400 || fakeTokenJson?.error !== "turnstile_failed") {
    throw new Error(
      `Expected turnstile_failed (400) but received ${fakeTokenResponse.status} ${JSON.stringify(fakeTokenJson)}`,
    );
  }

  return {
    noToken: noTokenJson,
    fakeToken: fakeTokenJson,
  };
}

async function verifyAdminProtection() {
  const response = await fetch(`${baseUrl}/admin/inbox`, {
    redirect: "manual",
  });

  if (mode === "candidate") {
    const body = await response.text();

    if (response.status !== 200) {
      throw new Error(`/admin/inbox expected 200 blocked panel in candidate mode but received ${response.status}`);
    }

    if (!body.includes("접근 권한이 필요한 편집 화면입니다")) {
      throw new Error("Candidate admin response did not contain the blocked-panel copy");
    }

    return {
      status: response.status,
      protection: "blocked-panel",
    };
  }

  const location = response.headers.get("location") ?? "";

  if (response.status !== 302 && response.status !== 301) {
    const body = await response.text();
    throw new Error(`/admin/inbox expected redirect in production mode but received ${response.status}\n${body}`);
  }

  if (!location.includes("cloudflareaccess.com") && !location.includes("/cdn-cgi/access/")) {
    throw new Error(`Production admin redirect did not look like Cloudflare Access: ${location}`);
  }

  return {
    status: response.status,
    protection: "cloudflare-access",
    location,
  };
}

const publicConfig = await verifyPublicSubmitConfig();
const routeVerification = await expectRouteStatuses();
await verifyProductionHostCanonicalization();
const seoVerification = await verifySeoSurface();
const submitProtection = await verifySubmitProtection();
const adminProtection = await verifyAdminProtection();

console.log(
  JSON.stringify(
    {
      ok: true,
      mode,
      baseUrl,
      slugInventory: {
        canonical: slugInventory?.smokeSamples?.canonical ?? null,
        alias: slugInventory?.smokeSamples?.alias ?? null,
      },
      routeVerification,
      seoVerification,
      publicConfig,
      submitProtection,
      adminProtection,
    },
    null,
    2,
  ),
);
