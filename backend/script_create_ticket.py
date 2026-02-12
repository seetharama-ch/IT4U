import urllib.request
import json
import time

BASE_URL = "http://localhost:8080/api"

def create_ticket():
    # 1. Get Employee ID
    try:
        with urllib.request.urlopen(f"{BASE_URL}/users") as response:
            users = json.loads(response.read().decode('utf-8'))
            employee = next((u for u in users if u['role'] == 'EMPLOYEE'), None)
            if not employee:
                print("No employee found")
                return
    except Exception as e:
        print(f"Error fetching users: {e}")
        return

    # 2. Create Ticket
    url = f"{BASE_URL}/tickets"
    headers = {"Content-Type": "application/json"}
    data = {
        "title": "Hybrid E2E Test Ticket",
        "description": "Created via script, will approve via browser.",
        "category": "HARDWARE",
        "priority": "HIGH",
        "requester": {"id": employee['id']} 
    }
    
    try:
        req = urllib.request.Request(url, data=json.dumps(data).encode('utf-8'), headers=headers)
        with urllib.request.urlopen(req) as response:
            ticket = json.loads(response.read().decode('utf-8'))
            print(f"CREATED_TICKET_ID: {ticket['id']}")
    except Exception as e:
        print(f"Error creating ticket: {e}")

if __name__ == "__main__":
    create_ticket()
