type EditorialQueueMessage = {
  type?: string;
  proposalId?: string;
  submittedAt?: string;
};

const knownTaskTypes = new Set([
  "proposal.received",
  "proposal.normalize.requested",
  "proposal.entity_extract.requested",
]);

function isKnownTaskType(type?: string): type is string {
  return Boolean(type && knownTaskTypes.has(type));
}

async function upsertJobStatus(
  env: CloudflareEnv,
  proposalId: string,
  taskType: string,
  status: "processing" | "completed" | "failed",
  timestamp: string,
  errorMessage?: string,
) {
  await env.EDITORIAL_DB.prepare(
    `INSERT INTO proposal_processing_job (
       id,
       proposal_id,
       task_type,
       status,
       payload_json,
       error_message,
       created_at,
       updated_at,
       completed_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(proposal_id, task_type)
     DO UPDATE SET
       status = excluded.status,
       payload_json = excluded.payload_json,
       error_message = excluded.error_message,
       updated_at = excluded.updated_at,
       completed_at = excluded.completed_at`,
  )
    .bind(
      crypto.randomUUID(),
      proposalId,
      taskType,
      status,
      JSON.stringify({ type: taskType, proposalId }),
      errorMessage ?? null,
      timestamp,
      timestamp,
      status === "completed" ? timestamp : null,
    )
    .run();
}

async function appendSystemEvent(
  env: CloudflareEnv,
  proposalId: string,
  note: string,
  timestamp: string,
) {
  await env.EDITORIAL_DB.prepare(
    `INSERT INTO workflow_event (
       id,
       subject_type,
       subject_id,
       from_state,
       to_state,
       actor_type,
       actor_id,
       note,
       created_at
     ) VALUES (?, 'proposal', ?, NULL, NULL, 'system', NULL, ?, ?)`,
  )
    .bind(crypto.randomUUID(), proposalId, note, timestamp)
    .run();
}

async function handleKnownTask(
  env: CloudflareEnv,
  proposalId: string,
  taskType: string,
  timestamp: string,
) {
  await upsertJobStatus(env, proposalId, taskType, "processing", timestamp);

  switch (taskType) {
    case "proposal.received":
    case "proposal.normalize.requested":
    case "proposal.entity_extract.requested":
      break;
    default:
      throw new Error(`Unsupported editorial queue task: ${taskType}`);
  }

  await upsertJobStatus(env, proposalId, taskType, "completed", new Date().toISOString());
}

export async function handleEditorialQueue(
  batch: MessageBatch<EditorialQueueMessage>,
  env: CloudflareEnv,
) {
  await Promise.all(
    batch.messages.map(async (message) => {
      const body = message.body;
      const proposalId = body?.proposalId?.trim();
      const taskType = body?.type?.trim();

      if (!proposalId || !isKnownTaskType(taskType)) {
        message.ack();
        return;
      }

      const now = new Date().toISOString();

      try {
        await handleKnownTask(env, proposalId, taskType, now);
        message.ack();
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown queue consumer failure";

        await upsertJobStatus(env, proposalId, taskType, "failed", new Date().toISOString(), errorMessage);
        await appendSystemEvent(
          env,
          proposalId,
          `Queue task failed: ${taskType} · ${errorMessage}`,
          new Date().toISOString(),
        );

        if (message.attempts < 3) {
          message.retry({ delaySeconds: Math.min(30 * message.attempts, 300) });
          return;
        }

        message.ack();
      }
    }),
  );
}
