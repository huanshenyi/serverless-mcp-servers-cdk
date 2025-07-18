import { serve } from '@hono/node-server'
import { Hono } from "hono";
import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import type {
  CallToolResult,
  GetPromptResult,
  ReadResourceResult,
} from "@modelcontextprotocol/sdk/types.js";
import { toFetchResponse, toReqRes } from "fetch-to-node";

const getServer = () => {
  // Create an MCP server with implementation details
  const server = new McpServer(
    {
      name: "stateless-streamable-http-server",
      version: "1.0.0",
    },
    { capabilities: { logging: {} } }
  );

  // Register a simple prompt
  server.prompt(
    "greeting-template",
    "A simple greeting prompt template",
    {
      name: z.string().describe("Name to include in greeting"),
    },
    async ({ name }): Promise<GetPromptResult> => {
      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `Please greet ${name} in a friendly manner.`,
            },
          },
        ],
      };
    }
  );

  // Register a tool specifically for testing resumability
  server.tool(
    "start-notification-stream",
    "Starts sending periodic notifications for testing resumability",
    {
      interval: z
        .number()
        .describe("Interval in milliseconds between notifications")
        .default(100),
      count: z
        .number()
        .describe("Number of notifications to send (0 for 100)")
        .default(10),
    },
    async (
      { interval, count },
      { sendNotification }
    ): Promise<CallToolResult> => {
      const sleep = (ms: number) =>
        new Promise((resolve) => setTimeout(resolve, ms));
      let counter = 0;

      while (count === 0 || counter < count) {
        counter++;
        try {
          await sendNotification({
            method: "notifications/message",
            params: {
              level: "info",
              data: `Periodic notification #${counter} at ${new Date().toISOString()}`,
            },
          });
        } catch (error) {
          console.error("Error sending notification:", error);
        }
        // Wait for the specified interval
        await sleep(interval);
      }

      return {
        content: [
          {
            type: "text",
            text: `Started sending periodic notifications every ${interval}ms`,
          },
        ],
      };
    }
  );

  // pingツールを移植するためのコードを追加
  let SHORT_DELAY = false;
  const SHORT_DELAY_MS = 100;
  const LONG_DELAY_MS = 1000;
  server.tool("ping", async () => {
    const startTime = Date.now();
    SHORT_DELAY=!SHORT_DELAY;
    const delay = SHORT_DELAY ? SHORT_DELAY_MS : LONG_DELAY_MS;
    const sleep = (ms: number) =>
      new Promise((resolve) => setTimeout(resolve, ms));
    await sleep(delay);
    const endTime = Date.now();
    return {
      content: [
        {
          type: "text",
          text: `Ping response time: ${endTime - startTime}ms`,
        },
      ],
    };
  });

  // Create a simple resource at a fixed URI
  server.resource(
    "greeting-resource",
    "https://example.com/greetings/default",
    { mimeType: "text/plain" },
    async (): Promise<ReadResourceResult> => {
      return {
        contents: [
          {
            uri: "https://example.com/greetings/default",
            text: "Hello, world!",
          },
        ],
      };
    }
  );

  // Added for extra debuggability
  server.server.onerror = console.error.bind(console);

  return server;
};

const app = new Hono();

// Bearer token authentication middleware
app.use('/mcp', async (c, next) => {
  const auth = c.req.header('Authorization');
  if (!auth || !auth.startsWith('Bearer ')) {
    return c.json({
      jsonrpc: "2.0",
      error: {
        code: -32001,
        message: "Unauthorized: Bearer token required",
      },
      id: null,
    }, 401);
  }
  
  const token = auth.slice(7);
  const expectedToken = process.env.MCP_AUTH_TOKEN;
  
  if (!expectedToken) {
    console.warn("MCP_AUTH_TOKEN environment variable not set, authentication disabled");
    await next();
    return;
  }
  
  if (token !== expectedToken) {
    return c.json({
      jsonrpc: "2.0",
      error: {
        code: -32001,
        message: "Unauthorized: Invalid token",
      },
      id: null,
    }, 401);
  }
  
  await next();
});

app.post("/mcp", async (c) => {
  const { req, res } = toReqRes(c.req.raw);

  const server = getServer();

  try {
    const transport: StreamableHTTPServerTransport =
      new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
      });

    // Added for extra debuggability
    transport.onerror = console.error.bind(console);

    await server.connect(transport);

    await transport.handleRequest(req, res, await c.req.json());

    res.on("close", () => {
      console.log("Request closed");
      transport.close();
      server.close();
    });

    return toFetchResponse(res);
  } catch (e) {
    console.error(e);
    return c.json(
      {
        jsonrpc: "2.0",
        error: {
          code: -32603,
          message: "Internal server error",
        },
        id: null,
      },
      { status: 500 }
    );
  }
});

app.get("/mcp", async (c) => {
  console.log("Received GET MCP request");
  return c.json(
    {
      jsonrpc: "2.0",
      error: {
        code: -32000,
        message: "Method not allowed.",
      },
      id: null,
    },
    { status: 405 }
  );
});

app.delete("/mcp", async (c) => {
  console.log("Received DELETE MCP request");
  return c.json(
    {
      jsonrpc: "2.0",
      error: {
        code: -32000,
        message: "Method not allowed.",
      },
      id: null,
    },
    { status: 405 }
  );
});

export default app;

serve({
  fetch: app.fetch,
  port: 3000
}, (info) => {
  console.log(`listening on  http://localhost:${info.port}`)
})
