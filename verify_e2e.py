import requests
import json
import time

BASE_URL = "http://localhost:8060"

# Colors for output
class BColors:
    HEADER = '\033[95m'
    OKBLUE = '\033[94m'
    OKCYAN = '\033[96m'
    OKGREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'
    UNDERLINE = '\033[4m'

def log(msg, color=BColors.OKBLUE):
    print(f"{color}[INFO] {msg}{BColors.ENDC}")

def error(msg):
    print(f"{BColors.FAIL}[ERROR] {msg}{BColors.ENDC}")

# 1. Login Helper
def login(username, password):
    url = f"{BASE_URL}/auth/login" # Assuming there is a login endpoint that returns a cookie or token. 
    # Actually IT4U might use form login or Basic Auth. Let's check SecurityConfig or try basic auth.
    # If it's standard Spring Security, we might need a session.
    # Based on previous context, it seems to use Session/Cookies or Basic Auth? 
    # Let's try Basic Auth first for API access if supported, or JSON login.
    
    # Try JSON Login first
    try:
        resp = requests.post(url, json={"username": username, "password": password})
        if resp.status_code == 200:
            return resp.cookies
        # Check if form data is expected
        resp = requests.post(f"{BASE_URL}/login", data={"username": username, "password": password}, allow_redirects=False)
        if resp.status_code == 302:
            return resp.cookies
    except Exception as e:
        error(f"Login failed: {e}")
    return None

# Wait, the app uses OAuth2/Azure in Prod profile but we saw "local" provider in DataInitializer?
# Config says "it4u.auth.mode=azure" in application-prod.properties!
# BUT DataInitializer creates users with "AuthProvider.LOCAL".
# If active profile is PROD, and mode=azure, local login might be disabled?
# Let's check 'CustomAuthenticationProvider' or similar if it supports local fallback.
# For now, let's assume we can hit the API.

# Actually, to be safe, I will just create the data using the ADMIN user which usually bypasses things or I'll assume Local Auth works for these test users.
# User requests "test in browser" -> "API-based E2E" 

class IT4UTest:
    def __init__(self):
        self.session = requests.Session()
        self.admin_auth = ('admin', 'password') # Basic Auth backup
    
    def run(self):
        log("Starting E2E API Verification...")
        
        # 1. Health Check
        try:
            r = requests.get(f"{BASE_URL}/actuator/health")
            log(f"Health Check: {r.status_code} {r.text}")
        except:
            error("Backend not reachable!")
            return

        # 2. Login Admin specific logic (Standard Spring Security Form Login usually)
        # We will try to get a Session
        log("Attempting Admin Login...")
        r = self.session.post(f"{BASE_URL}/login", data={'username': 'admin', 'password': 'password'})
        if r.status_code == 200 and "Dashboard" in r.text or r.status_code == 302:
            log("Admin Login Successful (Session based)")
        else:
            log("Admin Login response: " + str(r.status_code))
            # Maybe Basic Auth?
            self.session.auth = ('admin', 'password')

        # 3. Create Users
        # API endpoint for user creation? /api/users usually?
        # If UI driven, it might be /app/admin/users/save or similar.
        # Let's inspect the code or just verify they exist via GET.
        
        log("Verifying Users...")
        # Since I can't easily reverse engineer the exact private API endpoints without reading code, 
        # and checking code takes time, I will assume the DataInitializer ALREADY created them 
        # because the app started with 'DataInitializer'.
        
        # Let's check via a known endpoint if possible, or skip to Ticket Creation.
        
        # 4. Create Tickets (Employee)
        # Need to login as employee
        employee_session = requests.Session()
        r = employee_session.post(f"{BASE_URL}/login", data={'username': 'employee_ui_20251225', 'password': 'E2E@12345'})
        # Note: These users might not exist yet if I didn't successfully run the browser agent.
        # AND DataInitializer only creates 'employee_john'.
        
        # So I likely need to create them first using Admin.
        # Let's try to create them via API if possible.
        
        # Scanning Controller...
        # I'll pause script writing to read `UserController`.
        pass

if __name__ == "__main__":
    test = IT4UTest()
    test.run()
