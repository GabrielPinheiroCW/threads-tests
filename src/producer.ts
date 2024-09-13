import { Kafka, Partitioners } from "kafkajs";
import dotenv from "dotenv";
import { countMessages } from "./database";

dotenv.config();

const MAX_MESSAGES = parseInt(process.env.MAX_MESSAGES || "100", 10);

const kafka = new Kafka({
  clientId: "my-app",
  brokers: (process.env.KAFKA_BROKERS || "localhost:9092").split(","),
});

const producer = kafka.producer({
  createPartitioner: Partitioners.LegacyPartitioner,
});

async function run() {
  await producer.connect();

  // const messagesLength = await countMessages();

  for (let i = 1; i <= MAX_MESSAGES; i++) {
    producer.send({
      topic: "my-topic",
      messages: [{ value: `Message ${i}` }],
    });
    console.log(`Message ${i} sent`);
  }

  await producer.disconnect();
}

run().catch(console.error);
