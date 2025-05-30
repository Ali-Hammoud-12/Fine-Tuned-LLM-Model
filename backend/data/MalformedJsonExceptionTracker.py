import json
import os

def is_valid_gemini_format(obj):
    try:
        if 'systemInstruction' not in obj:
            return False
        si = obj['systemInstruction']
        if si.get('role') != 'system' or not isinstance(si.get('parts'), list):
            return False
        if not si['parts'][0].get('text'):
            return False

        contents = obj.get('contents', [])
        if len(contents) != 2:
            return False
        roles = {c.get('role') for c in contents}
        if 'user' not in roles or 'model' not in roles:
            return False

        for part in contents:
            if not isinstance(part.get('parts'), list):
                return False
            if not part['parts'][0].get('text'):
                return False

        return True
    except Exception:
        return False

input_path = "./backend/data/filtered-training-dataset.jsonl"
temp_output_path = "tmp-cleaned.jsonl"

with open(input_path, "r", encoding="utf-8") as fin:
    lines = fin.readlines()

with open(temp_output_path, "w", encoding="utf-8") as fout:
    for i, line in enumerate(lines):
        try:
            obj = json.loads(line)
            if is_valid_gemini_format(obj):
                fout.write(line)
            else:
                print(f"❌ Skipping schema-invalid line {i+1}")
        except json.JSONDecodeError:
            print(f"❌ Skipping malformed JSON line {i+1}")

# ✅ Replace original file
os.replace(temp_output_path, input_path)
print(f"✅ Cleaned file written to: {input_path}")
