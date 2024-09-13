import { Kafka, logLevel, EachBatchPayload, EachMessagePayload } from "kafkajs";
import { initialize } from "./worker";
import dotenv from "dotenv";
import * as path from "path";

dotenv.config();

const WORKER_FILE = path.join(__dirname, "task.ts");
const CLUSTER_SIZE = parseInt(process.env.CLUSTER_SIZE || "10", 10);
const MAX_BATCH_SIZE = parseInt(process.env.MAX_BATCH_SIZE || "10", 10);

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
    backgroundTaskFile: WORKER_FILE,
    clusterSize: CLUSTER_SIZE,
    onError: (error) => {
      console.error("[onError]", error);
    },
    onMessage: () => {
      processedMessages++;
      console.log(`[onMessage] Message ${processedMessages} finished`);
    },
  });

  await consumer.run({
    eachBatch: async (payload: EachBatchPayload) => {
      console.log(
        `[eachBatch] Processing batch with ${payload.batch.messages.length} messages`
      );

      const messages = payload.batch.messages
        .map((m) => m.value?.toString())
        .filter((m) => m) as string[];

      let sentMessage = 0;
      while (sentMessage < messages.length) {
        await new Promise((resolve) => setTimeout(resolve, 10));
        if (sentMessage - processedMessages < CLUSTER_SIZE) {
          console.log(`${sentMessage}/${messages.length}`);
          processes.sendToChild(messages[sentMessage]);
          sentMessage++;
        }
      }
    },
  });

  console.log("Consumer started");
}

run().catch(console.error);
