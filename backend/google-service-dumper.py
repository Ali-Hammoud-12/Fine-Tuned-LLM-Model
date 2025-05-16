import json
import os

with open(os.path.join(os.path.dirname(__file__), "client-google-services.json"), "r") as f:
    content = f.read()
    print(json.dumps(content)) 