import axios from "axios";
import { saveMessage } from "./database";

const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:8080";

async function processMessage(message: string, startTime: Date) {
  try {
    const processResponse = await axios.post(`${API_BASE_URL}/api/process`, {
      message,
    });
    const processedData = processResponse.data.processedData;

    await saveMessage(JSON.stringify(processedData));

    return { success: true, processedData };
  } catch (error) {
    if (error instanceof Error) {
      // console.error("Error processing message:", error.message);
      return { success: false, error: error.message };
    }

    // console.error("Error processing message:", error);
    return { success: false, error: "An unknown error occurred" };
  }
}

process.on("message", async (message: string) => {
  const startTime = new Date();
  console.log(`Message received in ${startTime}`);

  await processMessage(message, startTime);
  const processingTime = Date.now() - startTime.getTime();

  console.log(`Message processed in ${processingTime}ms`);

  if (process.send) {
    // console.log(
    //   `Worker finish processing ${
    //     result.success ? "successfully" : "with error"
    //   } in ${processingTime}ms`
    // );
    process.send("item-done");
  }
});
