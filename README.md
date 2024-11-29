# ChatBot-Openai-App

## Implementation

**Step 1: Clone the repository**

```bash
mkdir ChatBot
cd ChatBot
git clone https://github.com/Ali-Hammoud-12/ChatBot.git
```
Now there is 2 ways to run this application, either using python debugger or docker.

**Step 2.1 : Using python debugger** 
```bash
python app.py
```
**Step 2.2: Using Docker** 
```bash
docker build -t chatbot-openai-app .
docker run -p 5000:5000  --env-file .env --name my-flask-app flask-openai-app
```

**Important Note:** This project tries as much as possible to lower OpenAI API token costs by using:
- Older model for text generation

If you want to increase the output quality do the following:

```bash
# For text
response = openai.ChatCompletion.create(
            model="gpt-3.5-turbo", # Use a newer model ex: gpt-4
            messages=messages,
            max_tokens=512,
            temperature=0.8,
        )
```
```bash
# For Image
response = openai.Image.create(
            model="dall-e-2", # Use a newer model ex: dall-e-3
            prompt=prompt,
            n=1,
            size="256x256", # Increase Image size ex: 1024x1024
            quality="standard" # Increase Image resolution ex: hd
        )
```

# Beware of incurring cost

**DALL·E Pricing Table**

| Model       | Quality  | Resolution        | Price per Image       |
|-------------|----------|-------------------|-----------------------|
| DALL·E 3    | Standard | 1024×1024         | $0.040                |
| DALL·E 3    | Standard | 1024×1792,1792×1024 | $0.080             |
| DALL·E 3    | HD       | 1024×1024         | $0.080                |
| DALL·E 3    | HD       | 1024×1792, 1792×1024 | $0.120             |
| DALL·E 2    |          | 1024×1024         | $0.020                |
| DALL·E 2    |          | 512×512           | $0.018                |
| DALL·E 2    |          | 256×256           | $0.016                |

**GPT Model Pricing Table (Per 1K Token)**

| Model                     | Input Price per 1K Tokens | Output Price per 1K Tokens |
|---------------------------|---------------------------|----------------------------|
| chatgpt-4o-latest         | $0.0050                  | $0.0150                   |
| gpt-4-turbo               | $0.0100                  | $0.0300                   |
| gpt-4-turbo-2024-04-09    | $0.0100                  | $0.0300                   |
| gpt-4                     | $0.0300                  | $0.0600                   |
| gpt-4-32k                 | $0.0600                  | $0.1200                   |
| gpt-4-0125-preview        | $0.0100                  | $0.0300                   |
| gpt-4-1106-preview        | $0.0100                  | $0.0300                   |
| gpt-4-vision-preview      | $0.0100                  | $0.0300                   |
| gpt-3.5-turbo-0125        | $0.0005                  | $0.0015                   |
| gpt-3.5-turbo-instruct    | $0.0015                  | $0.0020                   |
| gpt-3.5-turbo-1106        | $0.0010                  | $0.0020                   |
| gpt-3.5-turbo-0613        | $0.0015                  | $0.0020                   |
| gpt-3.5-turbo-16k-0613    | $0.0030                  | $0.0040                   |
| gpt-3.5-turbo-0301        | $0.0015                  | $0.0020                   |
| davinci-002               | $0.0020                  | $0.0020                   |
| babbage-002               | $0.0004                  | $0.0004                   |

**GPT Model Pricing Table (Per 1M Tokens)**

| Model                     | Input Price per 1M Tokens | Output Price per 1M Tokens |
|---------------------------|---------------------------|----------------------------|
| chatgpt-4o-latest         | $5.00                    | $15.00                    |
| gpt-4-turbo               | $10.00                   | $30.00                    |
| gpt-4-turbo-2024-04-09    | $10.00                   | $30.00                    |
| gpt-4                     | $30.00                   | $60.00                    |
| gpt-4-32k                 | $60.00                   | $120.00                   |
| gpt-4-0125-preview        | $10.00                   | $30.00                    |
| gpt-4-1106-preview        | $10.00                   | $30.00                    |
| gpt-4-vision-preview      | $10.00                   | $30.00                    |
| gpt-3.5-turbo-0125        | $0.50                    | $1.50                     |
| gpt-3.5-turbo-instruct    | $1.50                    | $2.00                     |
| gpt-3.5-turbo-1106        | $1.00                    | $2.00                     |
| gpt-3.5-turbo-0613        | $1.50                    | $2.00                     |
| gpt-3.5-turbo-16k-0613    | $3.00                    | $4.00                     |
| gpt-3.5-turbo-0301        | $1.50                    | $2.00                     |
| davinci-002               | $2.00                    | $2.00                     |
| babbage-002               | $0.40                    | $0.40                     |

**Rule of thumb: 1 token is approximately 4 characters of English text**
- The word "ChatGPT" is one token.
- The sentence "This is a test sentence." is about 6 tokens.
