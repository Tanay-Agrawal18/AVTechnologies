import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { isRedisHealthy } from "@/lib/redis";

export async function GET() {
  try {
    const mongooseInstance = await connectDB();
    const readyState = mongooseInstance.connection.readyState;
    const redisConnected = await isRedisHealthy();

    // readyState: 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
    if (readyState === 1) {
      // Execute a lightweight ping command on the database
      if (mongooseInstance.connection.db) {
        await mongooseInstance.connection.db.command({ ping: 1 });
      }

      return NextResponse.json({
        status: "healthy",
        database: "connected",
        redis: redisConnected ? "connected" : "degraded",
        timestamp: new Date().toISOString(),
      });
    }

    return NextResponse.json(
      {
        status: "unhealthy",
        database: "disconnected",
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  } catch (err: unknown) {
    // Return sanitized status without exposing internal URIs, hosts, credentials or stack traces
    return NextResponse.json(
      {
        status: "unhealthy",
        database: "error",
        message: "Database ping failed",
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
