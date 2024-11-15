from openai import OpenAI
client = OpenAI(api_key="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")

question = input("What would you like to ask ChatGPT? ")

try:
    response = client.chat.completions.create(
        model="gpt-3.5-turbo",
        messages=[{"role": "user", "content": question}],
        max_tokens=512,
        n=1,
        stop=None,
        temperature=0.8,
    )
    answer = response.choices[0].message.content
    print("OpenAI:" + answer)
except OpenAI.error.RateLimitError:
    print("No tokens are available at this time.")

