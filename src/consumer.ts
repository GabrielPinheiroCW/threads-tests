import { Kafka, logLevel, EachBatchPayload, EachMessagePayload } from "kafkajs";
import { initialize } from "./worker";
import dotenv from "dotenv";
import * as path from "path";

dotenv.config();

const TASK_FILE = path.join(__dirname, "task.ts");
const CLUSTER_SIZE = parseInt(process.env.CLUSTER_SIZE || "10", 10);

const kafka = new Kafka({
  clientId: "my-app",
  brokers: (process.env.KAFKA_BROKERS || "localhost:9092").split(","),
  logLevel: logLevel.ERROR,
});

const consumer = kafka.consumer({ groupId: "my-group" });

async function run() {
  await consumer.connect();

  await consumer.subscribe({
    topic: "my-topic",
    fromBeginning: true,
  });

  let processedMessages = 0;

  const processes = initialize({
    backgroundTaskFile: TASK_FILE,
    clusterSize: CLUSTER_SIZE,
    onError: (error) => {
      console.error("[onError] Error", error);
    },
    onMessage: () => {
      processedMessages++;
      console.log(`[onMessage] Message ${processedMessages} done`);
    },
  });

  await consumer.run({
    eachMessage: async (payload: EachMessagePayload) => {
      const params = { message: payload.message.value?.toString() || "" };
      console.log("[eachMessage] Sending message", params);
      processes.sendToChild(params);
    },
  });

  console.log("[run] Consumer started");
}

run().catch(console.error);
