const baseArg = process.argv.find((arg) => arg.startsWith("--base-url="));
const modeArg = process.argv.find((arg) => arg.startsWith("--mode="));
const baseUrl = (baseArg?.split("=")[1] ?? "").replace(/\/$/, "");
const mode = modeArg?.split("=")[1] ?? "candidate";

if (!baseUrl) {
  console.error("Missing --base-url=<url>");
  process.exit(1);
}

if (!["candidate", "production"].includes(mode)) {
  console.error("Invalid --mode value. Use candidate or production.");
  process.exit(1);
}

const publicRoutes = [
  "/",
  "/articles",
  "/about",
  "/submit",
  "/articles/ai",
];

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

async function expectRouteStatuses() {
  for (const route of publicRoutes) {
    await expectStatus(`${baseUrl}${route}`, 200);
  }
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
