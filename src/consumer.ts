import {
  Kafka,
  Consumer,
  EachMessagePayload,
  logLevel,
  EachBatchPayload,
} from "kafkajs";
import { initialize } from "./cluster";
import cliProgress from "cli-progress";
import dotenv from "dotenv";
import * as path from "path";

dotenv.config();

const CLUSTER_SIZE = parseInt(process.env.CLUSTER_SIZE || "10", 10);
const TASK_FILE = path.join(__dirname, "worker.ts");
const MAX_RETRIES = 5;
const RETRY_INTERVAL = 5000;
const MAX_MESSAGES = parseInt(process.env.MAX_MESSAGES || "100", 10);

const kafka = new Kafka({
  clientId: "my-app",
  brokers: (process.env.KAFKA_BROKERS || "localhost:9092").split(","),
  logLevel: logLevel.ERROR,
});
let consumer: Consumer;
let progress: cliProgress.SingleBar | undefined;
let childProcess: ReturnType<typeof initialize> | undefined;

async function createConsumer() {
  consumer = kafka.consumer({ groupId: "my-group" });
  consumer.on(consumer.events.CRASH, handleConsumerCrash);
  return consumer;
}

async function run() {
  console.log(
    `Starting consumer at ${new Date().toISOString()} with ${CLUSTER_SIZE} clusters`
  );

  // progress = new cliProgress.SingleBar(
  //   {
  //     format: "progress [{bar}] {percentage}% | {value}/{total} | {duration}s",
  //     clearOnComplete: false,
  //   },
  //   cliProgress.Presets.shades_classic
  // );

  consumer = await createConsumer();
  await connectWithRetry();

  await consumer.subscribe({
    topic: "my-topic",
    fromBeginning: true,
  });

  await consumer.run({
    eachBatch: async (payload: EachBatchPayload) => {
      try {
        let totalProcessed = 0;

        childProcess = initialize({
          backgroundTaskFile: TASK_FILE,
          clusterSize: payload.batch.messages.length,
          async onMessage(_: unknown) {
            progress?.increment();

            if (++totalProcessed !== MAX_MESSAGES) return;

            console.log(
              `Finishing consumer at ${new Date().toISOString()} with ${totalProcessed} messages processed`
            );

            // finish batch
          },
        });

        payload.batch.messages.forEach(async (message) => {
          const data = message.value?.toString();
          childProcess?.sendToChild([data]);
        });
      } catch (error) {
        console.error("\nError processing message:", error);
      }
    },
  });

  // progress.start(MAX_MESSAGES, 0);
  console.log("Consumer started");
}

async function connectWithRetry(retries = MAX_RETRIES) {
  try {
    await consumer.connect();
  } catch (error) {
    console.error(`Failed to connect to Kafka. Retries left: ${retries}`);
    if (retries > 0) {
      await new Promise((resolve) => setTimeout(resolve, RETRY_INTERVAL));
      await connectWithRetry(retries - 1);
    } else {
      throw new Error("Max retries reached. Unable to connect to Kafka.");
    }
  }
}

async function handleConsumerCrash(event: { payload: { error: Error } }) {
  console.error("Consumer crashed. Error:", event.payload.error);
  await gracefulShutdown();
}

run().catch(async (error) => {
  console.error("Fatal error in consumer:", error);
  await gracefulShutdown();
});

async function gracefulShutdown() {
  await consumer?.disconnect();
  progress?.stop();
  childProcess?.killAll();
  process.exit(0);
}

process.on("SIGINT", gracefulShutdown);
process.on("SIGTERM", gracefulShutdown);
