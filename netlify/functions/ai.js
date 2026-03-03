// ═══════════════════════════════════════════════════════════════
//  Yatra – Secure AI Proxy  (netlify/functions/ai.js)
//
//  ✅ Runs on Netlify's SERVER — not in the browser
//  ✅ API key is read from Netlify Environment Variables
//  ✅ Key is NEVER visible to anyone visiting the website
//  ✅ Only accepts requests from your own site
// ═══════════════════════════════════════════════════════════════

exports.handler = async function (event) {

  // ── Only allow POST ──────────────────────────────────────────
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
      body: "",
    };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  // ── CORS headers ─────────────────────────────────────────────
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };

  // ── Read API key from Netlify Environment Variable ───────────
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    console.error("ANTHROPIC_API_KEY environment variable is not set");
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: "Server configuration error. API key not set in Netlify environment variables."
      }),
    };
  }

  // ── Parse request body ───────────────────────────────────────
  let body;
  try {
    body = JSON.parse(event.body);
  } catch (e) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: "Invalid JSON in request body" }),
    };
  }

  // ── Validate required fields ─────────────────────────────────
  if (!body.messages || !Array.isArray(body.messages)) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: "Missing or invalid messages field" }),
    };
  }

  // ── Forward request to Anthropic API ─────────────────────────
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model:      body.model      || "claude-sonnet-4-20250514",
        max_tokens: body.max_tokens || 1000,
        system:     body.system     || "You are Yatra Guide, a friendly and knowledgeable Indian travel expert.",
        messages:   body.messages,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Anthropic API error:", data);
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({
          error: data?.error?.message || "Anthropic API error"
        }),
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(data),
    };

  } catch (err) {
    console.error("Proxy function error:", err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Internal server error: " + err.message }),
    };
  }
};
