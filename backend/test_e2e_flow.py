import urllib.request
import urllib.parse
import json
import sys
import re

BASE_URL = "http://localhost:8060/api"

def get_cookie_header(filename):
    with open(filename, 'r') as f:
        content = f.read()
        # Simple extraction of JSESSIONID
        match = re.search(r'JSESSIONID[\t\s]+([A-Z0-9]+)', content)
        if match:
            return f"JSESSIONID={match.group(1)}"
        # Fallback for different format or if it's just the value
        if "JSESSIONID" in content:
            return content.strip()
    return ""

COOKIE_EMP = get_cookie_header("cookie_employee.txt")
COOKIE_MGR = get_cookie_header("cookie_manager.txt")
COOKIE_SUP = get_cookie_header("cookie_support.txt")

print(f"Cookies loaded. Emp: {COOKIE_EMP[:15]}...")

def call_api(method, endpoint, data=None, cookie=None):
    url = f"{BASE_URL}{endpoint}"
    headers = {"Content-Type": "application/json"}
    if cookie:
        headers["Cookie"] = cookie
    
    if data:
        body = json.dumps(data).encode('utf-8')
    else:
        body = None

    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as response:
            if response.status == 204:
                return None
            return json.loads(response.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        print(f"API Error {method} {endpoint}: {e.code} {e.reason}")
        print(e.read().decode('utf-8'))
        raise

def get_me(cookie):
    res = call_api("GET", "/auth/me", cookie=cookie)
    # /auth/me returns map with id, username etc or User object
    return res.get("id")

try:
    # 1. Get IDs
    sup_id = get_me(COOKIE_SUP)
    print(f"Support User ID: {sup_id}")

    t1_id = 75

    t1_check = call_api("GET", f"/tickets/{t1_id}", cookie=COOKIE_SUP)
    print(f"HW Ticket Status: {t1_check.get('status')}")

    # Retry Assignment always to verify fix
    print(f"Assigning {t1_id} to {sup_id}...")
    call_api("PATCH", f"/tickets/{t1_id}/assign?userId={sup_id}", cookie=COOKIE_SUP)
    print(f"Assigned Ticket {t1_id} to self")

    # Final Verify
    final_t1 = call_api("GET", f"/tickets/{t1_id}", cookie=COOKIE_SUP)
    print(f"Final State T1: Status={final_t1.get('status')}")
    assigned = final_t1.get('assignedTo')
    if assigned:
        print(f"Assigned Name: {assigned.get('username')}")
        print(f"Assigned ID: {assigned.get('id')}")
        if str(assigned.get('id')) == str(sup_id):
            print("MATCH: Assigned to Support User")
        else:
            print("MISMATCH: Assigned to someone else")
    else:
        print("Assigned To is NULL")

    # Dump full JSON to see if attachments/comments are there
    # print(json.dumps(final_t1, indent=2))

except Exception as e:
    print(f"\nFAILED: {e}")
