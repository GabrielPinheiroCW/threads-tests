import { Kafka, Partitioners } from "kafkajs";
import dotenv from "dotenv";

dotenv.config();

const kafka = new Kafka({
  clientId: "my-app",
  brokers: (process.env.KAFKA_BROKERS || "localhost:9092").split(","),
});

const producer = kafka.producer({
  createPartitioner: Partitioners.LegacyPartitioner,
});

const messageCount = parseInt(process.argv[2], 10) || 20;

async function run() {
  await producer.connect();

  for (let i = 1; i <= messageCount; i++) {
    await producer.send({
      topic: "my-topic",
      messages: [{ value: `Message ${i}` }],
    });
    console.log(`Message ${i} sent`);
  }

  await producer.disconnect();
}

run().catch(console.error);
