// Adversarial regression checks for the public server boundary.
// These tests do not call Atlas, Tavily, or an LLM: global fetch is replaced
// with deterministic stubs and every assertion checks whether an unsafe path
// was prevented before an upstream call or verdict could be produced.
import { test } from "node:test";
import assert from "node:assert/strict";
import { Readable } from "node:stream";
import {
  createAgentChatHandler,
  createAtlasProxyHandler,
  createConnectionResearchHandler,
  MAX_REQUEST_BODY_BYTES,
} from "../server/logic.mjs";

function request(body, { method = "POST", url = "" } = {}) {
  const source = typeof body === "string" ? body : JSON.stringify(body);
  const req = Readable.from([source]);
  req.method = method;
  req.url = url;
  return req;
}

function response() {
  const headers = new Map();
  let body = "";
  return {
    statusCode: 200,
    headers,
    setHeader(name, value) { headers.set(name.toLowerCase(), value); },
    end(value = "") { body = Buffer.isBuffer(value) ? value.toString("utf8") : String(value); },
    get body() { return body; },
    get json() {
      try { return JSON.parse(body); } catch { return null; }
    },
  };
}

async function invoke(handler, req) {
  const res = response();
  await handler(req, res);
  return res;
}

const ATLAS_ENV = () => ({
  ATLAS_BASE_URL: "https://sandbox.atriptech.com",
  ATLAS_CLIENT_ID: "client-id",
  ATLAS_CLIENT_SECRET: "client-secret",
});

const RESEARCH_ENV = () => ({
  VITE_AGENT_PROVIDER: "deepseek",
  LLM_API_KEY: "llm-key",
  LLM_BASE_URL: "https://llm.example.test/v1",
  LLM_MODEL: "test-model",
  TAVILY_API_KEY: "tavily-key",
});

const VALID_RESEARCH_BODY = {
  connection: {
    origin: "PVG",
    connectionAirport: "KUL",
    destination: "SIN",
    flightNumbers: ["D73331", "AK727"],
    scheduledConnectionMinutes: 115,
    price: 133.91,
    currency: "USD",
    minimumConnectionMinutes: 60,
    flyThruVerified: false,
    evidence: ["ATRIP offer has no verified single-PNR / Fly-Thru flag"],
    alternative: { flightNumbers: ["D73331", "AK707"], scheduledConnectionMinutes: 185, price: 148.1, currency: "USD" },
  },
};

function planningReply({ protectionStatus = "not-confirmed" } = {}) {
  return {
    model: "test-model",
    choices: [{
      message: {
        tool_calls: [
          {
            id: "official-call",
            function: {
              name: "search_connection_evidence",
              arguments: JSON.stringify({ evidence_type: "official", query: "AirAsia KUL Fly-Thru connection policy" }),
            },
          },
          {
            id: "community-call",
            function: {
              name: "search_connection_evidence",
              arguments: JSON.stringify({ evidence_type: "community", query: "KUL terminal transfer passenger experience" }),
            },
          },
        ],
      },
    }],
  };
}

function synthesisReply({ protectionStatus = "not-confirmed" } = {}) {
  return {
    model: "test-model",
    choices: [{
      finish_reason: "stop",
      message: {
        content: JSON.stringify({
          connectionFit: "tight",
          protectionStatus,
          recommendationSummary: "The buffered option adds time for a disclosed fare difference.",
          assessmentConfidence: "medium",
          rationale: "The selected window is above the published minimum but below the planning target.",
          keyFactors: ["Connection window"],
          limitations: ["No verified single-PNR evidence"],
          nextAction: "Verify the booking contract before purchase.",
        }),
      },
    }],
  };
}

function validTavilyResult(tier, url) {
  return {
    results: [{
      title: tier === "official" ? "AirAsia Fly-Thru connection policy" : "KUL terminal transfer passenger experience",
      url,
      content: tier === "official"
        ? "AirAsia Fly-Thru connections at the terminal use a 60 minute minimum connection time."
        : "Passengers describe terminal transfer, immigration and connection time at KUL.",
    }],
  };
}

test("Atlas proxy rejects an unimplemented servicing endpoint before using credentials", async () => {
  const originalFetch = globalThis.fetch;
  let upstreamCalls = 0;
  globalThis.fetch = async () => {
    upstreamCalls += 1;
    return new Response("{}", { status: 200 });
  };
  try {
    const res = await invoke(createAtlasProxyHandler(ATLAS_ENV), request({ orderNo: "attacker-controlled" }, { url: "/pay.do" }));
    assert.equal(res.statusCode, 404);
    assert.equal(res.json?.status, "unavailable");
    assert.equal(upstreamCalls, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("chat proxy fails closed on malformed JSON and oversized bodies", async () => {
  const originalFetch = globalThis.fetch;
  let upstreamCalls = 0;
  globalThis.fetch = async () => {
    upstreamCalls += 1;
    return new Response("{}", { status: 200 });
  };
  const env = () => ({ LLM_API_KEY: "llm-key", LLM_BASE_URL: "https://llm.example.test/v1" });
  try {
    const malformed = await invoke(createAgentChatHandler(env), request("{", { url: "/" }));
    assert.equal(malformed.statusCode, 400);
    assert.equal(upstreamCalls, 0);

    const oversized = await invoke(createAgentChatHandler(env), request("x".repeat(MAX_REQUEST_BODY_BYTES + 1), { url: "/" }));
    assert.equal(oversized.statusCode, 413);
    assert.equal(oversized.json?.status, "error");
    assert.equal(upstreamCalls, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("official evidence host is rechecked after Tavily and cannot be labelled as official", async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), body: options.body ? JSON.parse(options.body) : null });
    if (String(url) === "https://llm.example.test/v1/chat/completions") {
      return new Response(calls.length === 1 ? JSON.stringify(planningReply()) : JSON.stringify(synthesisReply()), { status: 200 });
    }
    if (String(url) === "https://api.tavily.com/search") {
      return new Response(calls.at(-1).body?.query?.toLowerCase().includes("passenger")
        ? JSON.stringify(validTavilyResult("community", "https://community.example.test/kul-transfer"))
        : JSON.stringify(validTavilyResult("official", "https://evil.example.test/fake-airasia-policy")), { status: 200 });
    }
    throw new Error(`unexpected upstream ${url}`);
  };
  try {
    const res = await invoke(createConnectionResearchHandler(RESEARCH_ENV), request(VALID_RESEARCH_BODY));
    assert.equal(res.statusCode, 200);
    assert.ok(Array.isArray(res.json?.sources));
    assert.ok(res.json.sources.every((source) => !source.url.includes("evil.example.test")));
    assert.ok(res.json.sources.some((source) => source.disclosed === true && source.tier === "official"));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("research refuses a confirmed-protection brief when no verify capability exists", async () => {
  const originalFetch = globalThis.fetch;
  let synthesisCalls = 0;
  globalThis.fetch = async (url, options = {}) => {
    if (String(url) === "https://llm.example.test/v1/chat/completions") {
      const body = options.body ? JSON.parse(options.body) : {};
      if (body.messages?.[0]?.content?.includes("final Connection Integrity assessor")) {
        synthesisCalls += 1;
        return new Response(JSON.stringify(synthesisReply({ protectionStatus: "confirmed" })), { status: 200 });
      }
      return new Response(JSON.stringify(planningReply()), { status: 200 });
    }
    if (String(url) === "https://api.tavily.com/search") {
      const body = options.body ? JSON.parse(options.body) : {};
      return new Response(JSON.stringify(body.query.toLowerCase().includes("passenger")
        ? validTavilyResult("community", "https://community.example.test/kul-transfer")
        : validTavilyResult("official", "https://support.airasia.com/fly-thru-policy")), { status: 200 });
    }
    throw new Error(`unexpected upstream ${url}`);
  };
  try {
    const res = await invoke(createConnectionResearchHandler(RESEARCH_ENV), request(VALID_RESEARCH_BODY));
    assert.equal(res.statusCode, 502);
    assert.equal(res.json?.status, "unavailable");
    assert.equal(synthesisCalls, 2, "unsafe synthesis is retried once, then fails closed");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("research refuses tool plans that omit either official or community evidence", async () => {
  const originalFetch = globalThis.fetch;
  let tavilyCalls = 0;
  globalThis.fetch = async (url) => {
    if (String(url) === "https://llm.example.test/v1/chat/completions") {
      return new Response(JSON.stringify({
        model: "test-model",
        choices: [{ message: { tool_calls: [{ id: "community-only", function: { name: "search_connection_evidence", arguments: JSON.stringify({ evidence_type: "community", query: "KUL transfer passenger experience" }) } }] } }],
      }), { status: 200 });
    }
    if (String(url) === "https://api.tavily.com/search") {
      tavilyCalls += 1;
      return new Response(JSON.stringify(validTavilyResult("community", "https://community.example.test/kul-transfer")), { status: 200 });
    }
    throw new Error(`unexpected upstream ${url}`);
  };
  try {
    const res = await invoke(createConnectionResearchHandler(RESEARCH_ENV), request(VALID_RESEARCH_BODY));
    assert.equal(res.statusCode, 502);
    assert.equal(tavilyCalls, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
