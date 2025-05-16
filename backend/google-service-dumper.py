import json
import os

with open(os.path.join(os.path.dirname(__file__), "client-google-services.json"), "r") as f:
    obj = json.load(f)
    print(json.dumps(obj))