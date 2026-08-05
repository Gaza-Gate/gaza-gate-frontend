"""Extract key endpoint details from the endpoints_extracted.json for the
features we need to update: products pagination, reviews pagination, seller reply."""
import json
import sys

with open(r"C:\Users\محمود\Downloads\gaza-gate-frontend\docs\endpoints_extracted.json", "r", encoding="utf-8") as f:
    data = json.load(f)

# Target endpoints
TARGETS = {
    "Reply To review": "REPLY",
    "Get Product Reviews": "PRODUCT_REVIEWS",
    "Get All Products Public": "PRODUCTS_PUBLIC",
    "Get Product Details Public": "PRODUCT_DETAILS",
    "Create Review": "CREATE_REVIEW",
    "Update Review": "UPDATE_REVIEW",
    "Get My Reviews": "MY_REVIEWS",
    "Get seller reviews": "SELLER_REVIEWS",
    "Get My Received Seller Reviews": "MY_RECEIVED_SELLER_REVIEWS",
    "Customer Seller Reviews": "CUSTOMER_SELLER_REVIEWS",
    "Customer Product Reviews": "CUSTOMER_PRODUCT_REVIEWS",
    "Seller Product Reviews": "SELLER_PRODUCT_REVIEWS",
    "Seller Customer Reviews": "SELLER_CUSTOMER_REVIEWS",
    "Get Seller Product Details": "SELLER_PRODUCT_DETAILS",
    "Create Seller Customer Review": "CREATE_SELLER_CUSTOMER_REVIEW",
    "Get All product": "ALL_PRODUCTS_RAW",
}

for ep in data:
    name = ep.get("name", "")
    if name not in TARGETS:
        continue

    print("=" * 80)
    print(f"NAME: {name}")
    print(f"CATEGORY: {ep.get('category')}")
    print(f"METHOD: {ep.get('method')}")
    print(f"URL: {ep.get('url')}")
    print(f"AUTH: {ep.get('authRequired')}")

    # Body
    if ep.get("bodyRaw"):
        print(f"BODY (raw): {ep['bodyRaw']}")
    if ep.get("query"):
        print(f"QUERY: {ep['query']}")
    if ep.get("urlParams"):
        print(f"URL PARAMS: {ep['urlParams']}")

    # Responses - we need the body to see pagination + reply structure
    for r in ep.get("responseCodes", []):
        print(f"\n  RESPONSE {r.get('code')} ({r.get('status')}):")
        body = r.get("body", "")
        if body:
            try:
                parsed = json.loads(body)
                print(f"  {json.dumps(parsed, indent=2, ensure_ascii=False)[:3000]}")
            except Exception:
                print(f"  RAW: {body[:2000]}")
    print()
