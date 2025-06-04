import json
import random

# ==== Configuration ====
TRAIN_INPUT_PATH = "./backend/data/complete-training-dataset.jsonl"
VAL_INPUT_PATH = "./backend/data/complete-validiation-dataset.jsonl"

TRAIN_OUTPUT_PATH = "./backend/data/filtered-training-dataset.jsonl"
VAL_OUTPUT_PATH = "./backend/data/filtered-validation-dataset.jsonl"

TRAIN_TARGET_SIZE = 6000
VAL_TARGET_SIZE = 1500

# Token count thresholds
MIN_TOKENS = 5
MAX_TOKENS = 80

def is_valid_example(line):
    try:
        obj = json.loads(line)
        user_text = obj['contents'][0]['parts'][0]['text']
        model_text = obj['contents'][1]['parts'][0]['text']
        user_tokens = len(user_text.split())
        model_tokens = len(model_text.split())
        return MIN_TOKENS <= user_tokens <= MAX_TOKENS and MIN_TOKENS <= model_tokens <= MAX_TOKENS
    except Exception:
        return False

def process_file(input_path, output_path, target_size):
    with open(input_path, 'r', encoding='utf-8') as infile:
        lines = infile.readlines()

    # Filter and shuffle
    valid_lines = [line for line in lines if is_valid_example(line)]
    print(f"✅ {len(valid_lines)} valid entries found in {input_path}")
    
    if len(valid_lines) < target_size:
        print(f"⚠️ Warning: Only {len(valid_lines)} valid entries available, using all of them.")
        subset = valid_lines
    else:
        random.shuffle(valid_lines)
        subset = valid_lines[:target_size]

    with open(output_path, 'w', encoding='utf-8') as outfile:
        outfile.writelines(subset)
    
    print(f"✅ Saved {len(subset)} entries to {output_path}")

# ==== Run on training and validation ====
process_file(TRAIN_INPUT_PATH, TRAIN_OUTPUT_PATH, TRAIN_TARGET_SIZE)
process_file(VAL_INPUT_PATH, VAL_OUTPUT_PATH, VAL_TARGET_SIZE)
