let clientPromise = null;
let clientInstance = null;
let initializationFailed = false;

const connect = async () => {
  if (clientPromise || initializationFailed) return clientPromise;

  try {
    const { createClient } = require("redis");
    const client = createClient({
      url: process.env.REDIS_URL || "redis://localhost:6379",
      socket: {
        connectTimeout: 2000,
      },
    });

    client.on("error", (err) => {
      initializationFailed = true;
      console.warn("Redis disabled (connection error):", err.message);
    });

    clientPromise = client.connect().then(() => {
      clientInstance = client;
      return clientInstance;
    });
  } catch (err) {
    initializationFailed = true;
    console.warn("Redis client not initialized:", err.message);
    clientPromise = Promise.resolve(null);
  }

  return clientPromise;
};

const getRedisClient = async () => {
  if (clientInstance) return clientInstance;
  return connect();
};

module.exports = { getRedisClient };
