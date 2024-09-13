import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

const pool = new Pool({
  host: process.env.POSTGRES_HOST,
  database: process.env.POSTGRES_DB,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  port: 5432,
});

export async function saveMessage(message: string): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("INSERT INTO messages(content) VALUES($1);", [message]);
  } finally {
    client.release();
  }
}

export async function createTable() {
  const client = await pool.connect();
  try {
    const queryText = `
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    await client.query(queryText);
    console.log("Table created successfully");
  } finally {
    client.release();
  }
}
