import { describe, expect, it } from "vitest";

describe("Z-API credentials", () => {
  it("should have all required Z-API environment variables set", () => {
    // These are validated at startup - just ensure they exist
    expect(process.env.ZAPI_INSTANCE_ID).toBeDefined();
    expect(process.env.ZAPI_INSTANCE_ID).not.toBe("");
    expect(process.env.ZAPI_TOKEN).toBeDefined();
    expect(process.env.ZAPI_TOKEN).not.toBe("");
    expect(process.env.ZAPI_CLIENT_TOKEN).toBeDefined();
    expect(process.env.ZAPI_CLIENT_TOKEN).not.toBe("");
    expect(process.env.ZAPI_GROUP_ID).toBeDefined();
    expect(process.env.ZAPI_GROUP_ID).not.toBe("");
  });

  it("should construct valid Z-API base URL", () => {
    const instanceId = process.env.ZAPI_INSTANCE_ID;
    const token = process.env.ZAPI_TOKEN;
    const baseUrl = `https://api.z-api.io/instances/${instanceId}/token/${token}`;
    expect(baseUrl).toContain("z-api.io");
    expect(baseUrl).toContain(instanceId);
    expect(baseUrl).toContain(token);
  });
});
