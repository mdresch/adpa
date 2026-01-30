/**
 * Purge the project-data-extraction dead-letter queue (DLQ).
 * Use when the DLQ has reached its max message limit and new failed jobs cannot be moved to the DLQ.
 *
 * Run from server: npx ts-node scripts/purge-extraction-dlq.ts
 * Or: node --import ts-node/esm scripts/purge-extraction-dlq.ts
 *
 * Requires RABBITMQ_URL in env (or defaults to amqp://localhost).
 */

import dotenv from "dotenv"
import path from "path"
dotenv.config({ path: path.join(__dirname, "..", ".env") })

const RABBIT_URL = process.env.RABBITMQ_URL || "amqp://localhost"
const DLQ_NAME = "project-data-extraction.dlq"

async function main() {
  const amqp = await import("amqplib")
  const conn = await amqp.connect(RABBIT_URL)
  const ch = await conn.createChannel()

  const result = await ch.checkQueue(DLQ_NAME)
  const count = result.messageCount
  console.log(`Queue ${DLQ_NAME} has ${count} messages. Purging...`)

  await ch.purgeQueue(DLQ_NAME)
  console.log(`Purged ${count} messages from ${DLQ_NAME}.`)

  await ch.close()
  await conn.close()
  process.exit(0)
}

main().catch((err) => {
  console.error("Purge failed:", err)
  process.exit(1)
})
