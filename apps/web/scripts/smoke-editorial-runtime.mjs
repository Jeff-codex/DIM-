const baseArg = process.argv.find((arg) => arg.startsWith("--base-url="));
const baseUrl = (baseArg?.split("=")[1] ?? "").replace(/\/$/, "");

if (!baseUrl) {
  console.error("Missing --base-url=<url>");
  process.exit(1);
}

async function readJson(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

async function expectStatus(url, expected, options) {
  const response = await fetch(url, options);

  if (response.status !== expected) {
    const body = await response.text();
    throw new Error(`${url} expected ${expected} but received ${response.status}\n${body}`);
  }

  return response;
}

const proposalPayload = {
  schemaVersion: 1,
  projectName: `Smoke ${new Date().toISOString()}`,
  summary: "Runtime smoke proposal",
  whyNow: "Validate submit and editorial runtime flow",
  references: [],
  locale: "ko-KR",
};

const publicConfigResponse = await expectStatus(
  `${baseUrl}/api/public-config/submit`,
  200,
);
const publicConfig = await readJson(publicConfigResponse);

const submitResponse = await expectStatus(`${baseUrl}/api/proposals`, 201, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify(proposalPayload),
});
const submitJson = await readJson(submitResponse);
const proposalId = submitJson?.proposalId;

if (!proposalId) {
  throw new Error("Proposal submission did not return a proposalId");
}

await expectStatus(`${baseUrl}/admin/inbox`, 200);

const triageResponse = await expectStatus(
  `${baseUrl}/api/admin/proposals/${proposalId}/triage`,
  200,
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      action: "in_review",
      note: "Smoke runtime triage",
    }),
  },
);
const triageJson = await readJson(triageResponse);

await expectStatus(`${baseUrl}/admin/drafts/${proposalId}/preview`, 200);

const snapshotCreateResponse = await expectStatus(
  `${baseUrl}/api/admin/drafts/${proposalId}/snapshot`,
  200,
  {
    method: "POST",
  },
);
const snapshotJson = await readJson(snapshotCreateResponse);

await expectStatus(`${baseUrl}/admin/drafts/${proposalId}/snapshot`, 200);

console.log(
  JSON.stringify(
    {
      ok: true,
      baseUrl,
      publicConfig,
      proposalId,
      triage: triageJson,
      snapshot: snapshotJson,
    },
    null,
    2,
  ),
);
