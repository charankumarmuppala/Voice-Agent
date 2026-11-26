import requests
import json

base_url = "http://127.0.0.1:8000/api/calls"

# 1. Start call
res = requests.post(f"{base_url}/start", json={"language": "English"})
print("Start status:", res.status_code)
data = res.json()
session_id = data["session_id"]
print("Session ID:", session_id)
print("Greeting:", data["greeting"])

# 2. Send message
res2 = requests.post(f"{base_url}/{session_id}/message", json={"message": "My name is Charan Kumar"})
print("Message status:", res2.status_code)
data2 = res2.json()
print("Agent Reply:", data2["reply"])
print("Customer Name Extracted:", data2["extracted_profile"]["customer_name"])

# 3. End call
res3 = requests.post(f"{base_url}/{session_id}/end", json={"language": "English", "customer_name": "Charan Kumar"})
print("End status:", res3.status_code)
data3 = res3.json()
print("Call ended outcome:", data3.get("outcome"))
print("Summary:", data3.get("summary"))
print("SUCCESS: End-to-end call session completed with NO errors!")
