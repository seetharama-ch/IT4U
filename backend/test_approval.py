import urllib.request
import json
import time

BASE_URL = "http://localhost:8080/api/tickets"

def create_ticket():
    url = BASE_URL
    headers = {"Content-Type": "application/json"}
    data = {
        "title": "Approval Test Ticket",
        "description": "Please approve this.",
        "category": "HARDWARE",
        "priority": "MEDIUM",
        "managerName": "John Doe",
        "managerEmail": "john@example.com"
    }
    req = urllib.request.Request(url, data=json.dumps(data).encode('utf-8'), headers=headers)
    with urllib.request.urlopen(req) as response:
        return json.loads(response.read().decode('utf-8'))

def update_approval(ticket_id, status):
    url = f"{BASE_URL}/{ticket_id}/approval"
    headers = {"Content-Type": "application/json"}
    data = {"managerApprovalStatus": status}
    print(f"Updating Ticket {ticket_id} to {status}...")
    req = urllib.request.Request(url, data=json.dumps(data).encode('utf-8'), headers=headers, method='PATCH')
    with urllib.request.urlopen(req) as response:
        return json.loads(response.read().decode('utf-8'))

def get_ticket(ticket_id):
    url = f"{BASE_URL}/{ticket_id}"
    with urllib.request.urlopen(url) as response:
        return json.loads(response.read().decode('utf-8'))

try:
    print("1. Creating Ticket...")
    ticket = create_ticket()
    ticket_id = ticket['id']
    print(f"Ticket Created: ID {ticket_id}, Approval: {ticket.get('managerApprovalStatus', 'PENDING')}")

    print("\n2. Approving Ticket...")
    updated_ticket = update_approval(ticket_id, "APPROVED")
    print(f"Status after Approve: {updated_ticket.get('managerApprovalStatus')}")
    assert updated_ticket.get('managerApprovalStatus') == "APPROVED"

    print("\n3. Rejecting Ticket...")
    updated_ticket = update_approval(ticket_id, "REJECTED")
    print(f"Status after Reject: {updated_ticket.get('managerApprovalStatus')}")
    assert updated_ticket.get('managerApprovalStatus') == "REJECTED"

    print("\nSUCCESS: Backend Approval Logic Verified!")

except Exception as e:
    print(f"\nFAILED: {e}")
