import json

with open("./backend/data/filtered-training-dataset.jsonl", "r", encoding="utf-8") as fin:
    lines = fin.readlines()

with open("./backend/data/cleaned-training-dataset.jsonl", "w", encoding="utf-8") as fout:
    for i, line in enumerate(lines):
        try:
            json.loads(line)
            fout.write(line)
        except json.JSONDecodeError:
            print(f"❌ Skipping malformed line {i+1}")
