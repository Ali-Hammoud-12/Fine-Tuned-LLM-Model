def copy_lines(input_file, output_file):
    with open(input_file, 'r', encoding='utf-8') as infile:
        lines = infile.readlines()
    with open(output_file, 'w', encoding='utf-8') as outfile:
        for index, line in enumerate(lines, start=1):
            if index % 2 == 0:
                outfile.write(line)
    with open(input_file, 'w', encoding='utf-8') as infile:
        for index, line in enumerate(lines, start=1):
            if index % 2 != 0:
                infile.write(line)

copy_lines('training-dataset.jsonl', 'validation-dataset.jsonl')
