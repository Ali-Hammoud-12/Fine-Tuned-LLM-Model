import os
import json
import tempfile

def load_creds():
    value = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")

    if value and os.path.exists(value):
        return  # Already a valid path to a JSON file

    try:
        # Write decoded JSON to a safe temp file (cross-platform)
        creds_json = json.loads(value)
        with tempfile.NamedTemporaryFile(delete=False, suffix=".json", mode="w") as f:
            json.dump(creds_json, f)
            os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = f.name
    except Exception:
        raise EnvironmentError("GOOGLE_APPLICATION_CREDENTIALS must be a file path or a valid JSON string.")
