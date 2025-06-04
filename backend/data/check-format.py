import json

input_path = "./backend/data/complete-validiation-dataset.jsonl"
output_path = "./backend/data/corrected-dataset.jsonl"
error_log_path = "./backend/data/malformed-lines.log"

def fix_line(line):
    try:
        data = json.loads(line.strip())

        # Validate systemInstruction
        if "systemInstruction" not in data:
            raise ValueError("Missing systemInstruction")

        si = data["systemInstruction"]
        if si.get("role") != "system":
            raise ValueError("systemInstruction role must be 'system'")
        if not isinstance(si.get("parts"), list) or not si["parts"] or "text" not in si["parts"][0]:
            raise ValueError("Invalid systemInstruction parts")

        # Validate contents
        contents = data.get("contents", [])
        if not isinstance(contents, list) or len(contents) != 2:
            raise ValueError("Contents must be list of 2 entries (user/model)")

        for message in contents:
            if message.get("role") not in ["user", "model"]:
                raise ValueError("Invalid role in contents")
            parts = message.get("parts")
            if not isinstance(parts, list) or not parts or "text" not in parts[0]:
                raise ValueError("Each content entry must have a 'text' part")

        # Passes all checks
        return json.dumps(data, separators=(',', ':'))

    except Exception as e:
        return None

with open(input_path, 'r', encoding='utf-8') as fin, \
     open(output_path, 'w', encoding='utf-8') as fout, \
     open(error_log_path, 'w', encoding='utf-8') as ferr:

    for i, line in enumerate(fin, start=1):
        fixed = fix_line(line)
        if fixed:
            fout.write(fixed + '\n')
        else:
            ferr.write(f"Line {i}: {line.strip()}\n")
