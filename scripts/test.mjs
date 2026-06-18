import neo4j from "neo4j-driver";

const driver = neo4j.driver(
  "neo4j://localhost:7687",
  neo4j.auth.basic(
    "neo4j",
    "hLqAMup_Hpf8kL6QLec9uIaTAiRG0b2r9ZOTU0YXWZM"
  )
);

try {
  await driver.verifyConnectivity();
  console.log("✅ Connected successfully");
} catch (err) {
  console.error("❌", err);
}

await driver.close();