import requests

url = "http://localhost:8000/viz"
payload = {
    "items": [
        {"survey_id": "tides_2022", "variable_id": "federal_govt_competent"},
        {"survey_id": "tides_2022", "variable_id": "govt_does_not_care"}
    ]
}

res = requests.post(url, json=payload)
print(res.status_code)
print(res.json())
