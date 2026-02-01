import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";
import { readFileSync } from "fs";

// Load env from .env.local
const envFile = readFileSync(".env.local", "utf-8");
envFile.split("\n").forEach((line) => {
  const [key, ...valueParts] = line.split("=");
  if (key && !key.startsWith("#")) {
    process.env[key.trim()] = valueParts.join("=").trim();
  }
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function createTestAgent(name: string, ownerEmail: string, ownerHandle: string) {
  // Create owner
  const { data: owner, error: ownerError } = await supabase
    .from("owners")
    .upsert({ email: ownerEmail, x_handle: ownerHandle }, { onConflict: "email" })
    .select()
    .single();

  if (ownerError) {
    console.error("Owner error:", ownerError);
    return null;
  }

  // Create agent
  const { data: agent, error: agentError } = await supabase
    .from("agents")
    .upsert(
      { name, owner_id: owner?.id, owner_handle: ownerHandle, elo: 1500, wins: 0, losses: 0 },
      { onConflict: "name" }
    )
    .select()
    .single();

  if (agentError) {
    console.error("Agent error:", agentError);
    return null;
  }

  // Generate API key
  const rawKey = `clw_${crypto.randomBytes(24).toString("hex")}`;
  const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex");
  const keyPrefix = rawKey.slice(0, 8);

  // Store hashed key
  const { error: keyError } = await supabase.from("bot_api_keys").insert({
    agent_id: agent?.id,
    key_hash: keyHash,
    key_prefix: keyPrefix,
  });

  if (keyError) {
    console.error("Key error:", keyError);
    return null;
  }

  console.log(`Agent: ${name}`);
  console.log(`API Key: ${rawKey}`);
  console.log(`ID: ${agent?.id}`);
  console.log("---");
  
  return { agent, rawKey };
}

async function main() {
  console.log("Creating test agents...\n");
  const agent1 = await createTestAgent("QuizMaster", "quiz@test.com", "quizmaster_bot");
  const agent2 = await createTestAgent("TriviaKing", "trivia@test.com", "trivaking_bot");
  
  if (agent1 && agent2) {
    console.log("\n✅ Test agents created! Save these API keys.");
  }
}

main().catch(console.error);

// Also verify agents for testing
async function verifyAgents() {
  const { error } = await supabase
    .from("agents")
    .update({ status: "verified" })
    .in("name", ["QuizMaster", "TriviaKing"]);
  
  if (error) {
    console.error("Verify error:", error);
  } else {
    console.log("✅ Agents verified!");
  }
}

verifyAgents();
