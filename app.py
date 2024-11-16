from openai import OpenAI
client = OpenAI(api_key="")

question = input("What would you like to ask ChatGPT? ")
response = client.chat.completions.create(
    model="",
    messages=[{"role": "user", "content": f"{question}"}],
    max_tokens=512,
    n=1,
    stop=None,
    temperature=0.8,
)
# print(response)
answer = response.choices[0].message.content
print("OpenAI:" + answer)