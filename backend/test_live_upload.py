import requests
import json

url = "http://127.0.0.1:8000/api/datasets/upload"
file_path = "app/data/sample_feedback_500.csv"

with open(file_path, "rb") as f:
    files = {"file": ("sample_feedback_500.csv", f, "text/csv")}
    resp = requests.post(url, files=files)

print("HTTP Status:", resp.status_code)
data = resp.json()
print("Success:", data.get("success"))
if data.get("success"):
    d = data["data"]
    print("Dataset ID:", d["dataset_id"])
    print("Total Rows:", d["total_rows"])
    print("Detected columns:", d["detected_columns"])
    mapping = d.get("suggested_mapping", {})
    print("Suggested Mapping:", json.dumps(mapping, indent=2))
    dataset_id = d["dataset_id"]

    # 1. Test Preview API
    preview_resp = requests.get(f"http://127.0.0.1:8000/api/datasets/{dataset_id}/preview?page=1&limit=5")
    print("\n--- Preview API ---")
    print("Preview HTTP Status:", preview_resp.status_code)
    prev_data = preview_resp.json()["data"]
    print("Preview Total Rows:", prev_data["total_rows"])
    print("Preview Page 1 Rows Count:", len(prev_data["rows"]))
    print("Sample Row 0:", prev_data["rows"][0])

    # 2. Test Normalization API
    norm_resp = requests.post(
        f"http://127.0.0.1:8000/api/datasets/{dataset_id}/normalize",
        json={"mapping": mapping}
    )
    print("\n--- Normalization API ---")
    print("Normalization HTTP Status:", norm_resp.status_code)
    norm_data = norm_resp.json()["data"]
    print("Total Raw Rows:", norm_data["total_raw_rows"])
    print("Accepted Records:", norm_data["accepted_records"])
    print("Flagged Records:", norm_data["flagged_records"])
    print("Skipped Blank Rows:", norm_data["skipped_blank_rows"])
    print("Flagged Summary:", norm_data["flagged_reasons_summary"])
