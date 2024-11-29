import openai

def generate_chat_response(user_text, conversation_history):
    """
    Generates a chat response from the gpt-4o-mini model.

    Args:
        user_text (str): The text input from the user (Request body).
        conversation_history (list): The list of previous messages in the conversation.

    Returns:
        str: The response from the GPT model.
    """
    messages = conversation_history + [{"role": "user", "content": user_text}]
    response = openai.chat.completions.create(
        model="gpt-4o-mini",
        messages=messages,
        max_tokens=512,
        temperature=0.8,
    )
    answer = response.choices[0].message.content
    conversation_history.append({"role": "assistant", "content": answer})
    return answer