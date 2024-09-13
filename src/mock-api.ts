import express from "express";
import { randomDelay } from "./utils";

const app = express();
const port = process.env.API_PORT || 8080;

app.use(express.json());

app.use((req, _, next) => {
  console.log("--- Incoming Request ---");
  console.log(`Method: ${req.method}`);
  console.log(`URL: ${req.url}`);
  console.log("Headers:", req.headers);
  console.log("Body:", req.body);
  console.log("------------------------");
  next();
});

app.use((_, res, next) => {
  const oldJson = res.json;
  res.json = function (body) {
    console.log("--- Outgoing Response ---");
    console.log(`Status: ${res.statusCode}`);
    console.log("Headers:", res.getHeaders());
    console.log("Body:", body);
    console.log("-------------------------");
    return oldJson.call(this, body);
  };
  next();
});

app.get("/health", (_, res) => {
  res.json({ status: "ok" });
});

app.get("/api/data/:id", async (req, res) => {
  const { id } = req.params;

  await randomDelay(500, 1000);

  const data = {
    id,
    timestamp: new Date().toISOString(),
    value: Math.random() * 100,
  };

  res.json(data);
});

app.post("/api/process", async (req, res) => {
  const { data } = req.body;

  await randomDelay(500, 2000);

  const result = {
    success: Math.random() > 0.1,
    processedData: {
      ...data,
      processed: true,
      processingTimestamp: new Date().toISOString(),
    },
  };

  if (result.success) {
    res.json(result);
  } else {
    res.status(500).json({ error: "Processing failed" });
  }
});

app.listen(port, () => {
  console.log(`API listening at http://localhost:${port}`);
});

export default app;
