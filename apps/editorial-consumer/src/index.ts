type QueueMessageBody = {
  type?: string;
  proposalId?: string;
  submittedAt?: string;
};

type Env = {
  EDITORIAL_DB: D1Database;
  DIM_WORKFLOW_ENV: string;
};

function noteForTask(taskType: string) {
  switch (taskType) {
    case "proposal.received":
      return "Queue consumer acknowledged proposal receipt";
    case "proposal.normalize.requested":
      return "Queue consumer completed normalize placeholder";
    case "proposal.entity_extract.requested":
      return "Queue consumer completed entity extraction placeholder";
    default:
      return "Queue consumer processed editorial job";
  }
}

async function upsertJob(
  env: Env,
  proposalId: string,
  taskType: string,
  payload: QueueMessageBody,
  status: "completed" | "failed",
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
      JSON.stringify(payload),
      errorMessage ?? null,
      timestamp,
      timestamp,
      status === "completed" ? timestamp : null,
    )
    .run();
}

async function appendWorkflowEvent(
  env: Env,
  proposalId: string,
  taskType: string,
  timestamp: string,
  note: string,
) {
  await env.EDITORIAL_DB.prepare(
    `INSERT INTO workflow_event (
       id,
       subject_type,
       subject_id,
       from_state,
       to_state,
       actor_type,
       note,
       created_at
     ) VALUES (?, 'proposal', ?, 'received', 'received', 'system', ?, ?)`,
  )
    .bind(crypto.randomUUID(), proposalId, `${taskType}: ${note}`, timestamp)
    .run();
}

export default {
  async queue(batch: MessageBatch<QueueMessageBody>, env: Env) {
    for (const message of batch.messages) {
      const body = message.body ?? {};
      const taskType = body.type?.trim();
      const proposalId = body.proposalId?.trim();
      const timestamp = new Date().toISOString();

      if (!taskType || !proposalId) {
        message.ack();
        continue;
      }

      try {
        await upsertJob(env, proposalId, taskType, body, "completed", timestamp);
        await appendWorkflowEvent(env, proposalId, taskType, timestamp, noteForTask(taskType));
        message.ack();
      } catch (error) {
        const messageText =
          error instanceof Error ? error.message : "Unknown queue consumer failure";

        await upsertJob(
          env,
          proposalId,
          taskType,
          body,
          "failed",
          timestamp,
          messageText,
        );
        message.retry();
      }
    }
  },
};
