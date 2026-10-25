import requests
import json

dataset_id = "a81d8820"
url = "http://127.0.0.1:8000/api/analysis/start"

# 1. Test analysis start without credentials
resp = requests.post(url, json={"dataset_id": dataset_id})
print("Start Analysis without API key Status:", resp.status_code)
print("Response JSON:", resp.json())
