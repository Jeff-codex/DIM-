import "server-only";
import { getEditorialEnv } from "@/lib/server/editorial/env";

type EditorialQueueEnv = Awaited<ReturnType<typeof getEditorialEnv>>;

export const proposalQueueTaskTypes = [
  "proposal.received",
  "proposal.normalize.requested",
  "proposal.entity_extract.requested",
] as const;

type ProposalQueueTaskType = (typeof proposalQueueTaskTypes)[number];

function buildQueueMessages(proposalId: string, submittedAt: string) {
  return proposalQueueTaskTypes.map((taskType) => ({
    body: {
      type: taskType,
      proposalId,
      ...(taskType === "proposal.received" ? { submittedAt } : {}),
    },
  }));
}

export async function upsertProposalProcessingJobs(
  env: EditorialQueueEnv,
  proposalId: string,
  timestamp: string,
  status: "queued" | "failed",
  errorMessage?: string,
) {
  await env.EDITORIAL_DB.batch(
    proposalQueueTaskTypes.map((taskType) =>
      env.EDITORIAL_DB.prepare(
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
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL)
         ON CONFLICT(proposal_id, task_type)
         DO UPDATE SET
           status = excluded.status,
           payload_json = excluded.payload_json,
           error_message = excluded.error_message,
           updated_at = excluded.updated_at,
           completed_at = NULL`,
      ).bind(
        crypto.randomUUID(),
        proposalId,
        taskType,
        status,
        JSON.stringify({ type: taskType, proposalId, submittedAt: timestamp }),
        errorMessage ?? null,
        timestamp,
        timestamp,
      ),
    ),
  );
}

export async function appendProposalWorkflowEvent(
  env: EditorialQueueEnv,
  proposalId: string,
  note: string,
  timestamp: string,
  actorType: "system" | "editor" = "system",
  actorId?: string,
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
     ) VALUES (?, 'proposal', ?, 'received', 'received', ?, ?, ?, ?)`,
  )
    .bind(
      crypto.randomUUID(),
      proposalId,
      actorType,
      actorId ?? null,
      note,
      timestamp,
    )
    .run();
}

export async function enqueueProposalProcessingJobs(
  env: EditorialQueueEnv,
  proposalId: string,
  options?: {
    timestamp?: string;
    note?: string;
    actorType?: "system" | "editor";
    actorId?: string;
  },
) {
  const timestamp = options?.timestamp ?? new Date().toISOString();

  try {
    await env.EDITORIAL_QUEUE.sendBatch(buildQueueMessages(proposalId, timestamp));
    await upsertProposalProcessingJobs(env, proposalId, timestamp, "queued");

    if (options?.note) {
      await appendProposalWorkflowEvent(
        env,
        proposalId,
        options.note,
        timestamp,
        options.actorType ?? "system",
        options.actorId,
      );
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Queue enqueue failed after submit";

    await upsertProposalProcessingJobs(env, proposalId, timestamp, "failed", errorMessage);
    await appendProposalWorkflowEvent(
      env,
      proposalId,
      options?.note ? `${options.note} · ${errorMessage}` : "Queue enqueue failed after submit",
      timestamp,
      options?.actorType ?? "system",
      options?.actorId,
    );

    throw error;
  }

  return {
    ok: true,
    queuedTaskCount: proposalQueueTaskTypes.length,
    queuedAt: timestamp,
  };
}

export function isKnownProposalQueueTask(taskType: string): taskType is ProposalQueueTaskType {
  return proposalQueueTaskTypes.includes(taskType as ProposalQueueTaskType);
}
