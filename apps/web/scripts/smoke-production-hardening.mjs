const baseArg = process.argv.find((arg) => arg.startsWith("--base-url="));
const modeArg = process.argv.find((arg) => arg.startsWith("--mode="));
const baseUrl = (baseArg?.split("=")[1] ?? "").replace(/\/$/, "");
const mode = modeArg?.split("=")[1] ?? "candidate";
const canonicalHost = "https://depthintelligence.kr";

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

const productionCanonicalArticleRoute = "/articles/ai-browser-interface-power";
const productionAliasArticleRoute = "/articles/ai";

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

async function expectRouteStatuses() {
  for (const route of shellRoutes) {
    await expectStatus(`${baseUrl}${route}`, 200);
  }

  if (mode !== "production") {
    return;
  }

  await expectStatus(`${baseUrl}${productionCanonicalArticleRoute}`, 200);

  const aliasResponse = await expectStatus(
    `${baseUrl}${productionAliasArticleRoute}`,
    308,
  );
  const location = aliasResponse.headers.get("location") ?? "";

  if (location !== productionCanonicalArticleRoute) {
    throw new Error(
      `${baseUrl}${productionAliasArticleRoute} expected location ${productionCanonicalArticleRoute} but received ${location}`,
    );
  }
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

  const canonicalArticle = await expectHtml(
    `${baseUrl}${productionCanonicalArticleRoute}`,
  );
  expectSingleCanonical(
    canonicalArticle.html,
    `${canonicalHost}${productionCanonicalArticleRoute}`,
    productionCanonicalArticleRoute,
  );
  expectIncludes(
    canonicalArticle.html,
    '"@type":"BreadcrumbList"',
    `${productionCanonicalArticleRoute} structured data`,
  );
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
await expectRouteStatuses();
await verifyProductionHostCanonicalization();
await verifySeoSurface();
const submitProtection = await verifySubmitProtection();
const adminProtection = await verifyAdminProtection();

console.log(
  JSON.stringify(
    {
      ok: true,
      mode,
      baseUrl,
      publicConfig,
      submitProtection,
      adminProtection,
    },
    null,
    2,
  ),
);
