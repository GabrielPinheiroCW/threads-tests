import dotenv from "dotenv";
import { saveMessage } from "./database";
import { DONE_SIGNAL } from "./worker";

dotenv.config();

async function processMessage(message: string) {
  try {
    // await new Promise((resolve) => setTimeout(resolve, 1000));
    await saveMessage(message);
  } catch (error) {
    console.error("[processMessage]", error);
  }
}

process.on("message", async (message: string) => {
  console.log(`[processMessage] Processing message: ${message}`);
  await processMessage(message);
  if (process.send) {
    console.log(`[processMessage] Processing send ${DONE_SIGNAL}`);
    try {
      process.send(DONE_SIGNAL);
    } catch (error) {
      console.error("[processMessage]", error);
    }
  }
});
