// Extract key endpoint details from the endpoints_extracted.json
const fs = require("fs");
const data = JSON.parse(fs.readFileSync("C:/Users/محمود/Downloads/gaza-gate-frontend/docs/endpoints_extracted.json", "utf8"));

const TARGETS = new Set([
  "Reply To review",
  "Get Product Reviews",
  "Get All Products Public",
  "Get Product Details Public",
  "Create Review",
  "Update Review",
  "Get My Reviews",
  "Get seller reviews",
  "Get My Received Seller Reviews",
  "Customer Seller Reviews",
  "Customer Product Reviews",
  "Seller Product Reviews",
  "Seller Customer Reviews",
  "Get Seller Product Details",
  "Create Seller Customer Review",
  "Get All product",
  "Create Product",
  "Get store products",
]);

const out = [];
for (const ep of data) {
  if (!TARGETS.has(ep.name)) continue;
  out.push("=".repeat(80));
  out.push(`NAME: ${ep.name}`);
  out.push(`CATEGORY: ${ep.category}`);
  out.push(`METHOD: ${ep.method}`);
  out.push(`URL: ${ep.url}`);
  out.push(`AUTH: ${ep.authRequired}`);
  if (ep.bodyRaw) out.push(`BODY (raw): ${ep.bodyRaw}`);
  if (ep.query && ep.query.length) out.push(`QUERY: ${JSON.stringify(ep.query)}`);
  if (ep.urlParams && ep.urlParams.length) out.push(`URL PARAMS: ${JSON.stringify(ep.urlParams)}`);
  for (const r of ep.responseCodes || []) {
    out.push(`  RESPONSE ${r.code} (${r.status}):`);
    if (r.body) {
      try {
        const parsed = JSON.parse(r.body);
        out.push("  " + JSON.stringify(parsed, null, 2).slice(0, 3500));
      } catch {
        out.push("  RAW: " + r.body.slice(0, 2000));
      }
    }
  }
  out.push("");
}

fs.writeFileSync("C:/Users/محمود/Downloads/gaza-gate-frontend/scripts/extracted_output.txt", out.join("\n"), "utf8");
console.log("Wrote " + out.length + " lines.");
