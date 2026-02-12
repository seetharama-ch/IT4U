import urllib.request
import json
import time
import sys

BASE_URL = "http://localhost:8080/api"

def get_users():
    url = f"{BASE_URL}/users"
    print(f"Fetching users from {url}...")
    try:
        with urllib.request.urlopen(url) as response:
            return json.loads(response.read().decode('utf-8'))
    except Exception as e:
        print(f"Error fetching users: {e}")
        return []

def create_ticket(requester_id):
    url = f"{BASE_URL}/tickets"
    headers = {"Content-Type": "application/json"}
    # Requester object with ID to link the relationship
    data = {
        "title": "Notification Test Ticket",
        "description": "Testing email notifications.",
        "category": "HARDWARE",
        "priority": "HIGH",
        "requester": {"id": requester_id} 
    }
    print(f"Creating Ticket for Requester ID {requester_id}...")
    req = urllib.request.Request(url, data=json.dumps(data).encode('utf-8'), headers=headers)
    with urllib.request.urlopen(req) as response:
        return json.loads(response.read().decode('utf-8'))

def update_approval(ticket_id, status):
    url = f"{BASE_URL}/tickets/{ticket_id}/approval"
    headers = {"Content-Type": "application/json"}
    data = {"managerApprovalStatus": status}
    print(f"Updating Ticket {ticket_id} to {status}...")
    req = urllib.request.Request(url, data=json.dumps(data).encode('utf-8'), headers=headers, method='PATCH')
    with urllib.request.urlopen(req) as response:
        return json.loads(response.read().decode('utf-8'))

def main():
    # 1. Get Users to find a valid Employee and Manager
    users = get_users()
    employee = next((u for u in users if u['role'] == 'EMPLOYEE'), None)
    
    if not employee:
        print("No Employee found! Cannot test.")
        sys.exit(1)
        
    print(f"Found Employee: {employee['username']} (ID: {employee['id']})")
    if 'manager' in employee and employee['manager']:
         print(f"Employee has manager: {employee['manager']['username']}")
    else:
         print("Warning: Employee has no manager linked. Approval emails might skip manager.")

    # 2. Create Ticket
    try:
        ticket = create_ticket(employee['id'])
        print(f"Ticket Created: ID {ticket['id']}")
    except Exception as e:
        print(f"Failed to create ticket: {e}")
        sys.exit(1)

    # Allow async processing time
    time.sleep(2)

    # 3. Approve Ticket
    try:
        update_approval(ticket['id'], "APPROVED")
        print("Ticket Approved.")
    except Exception as e:
        print(f"Failed to approve ticket: {e}")

    print("\nTest Sequence Complete. Check Server Logs for Email Output.")

if __name__ == "__main__":
    main()
