# A lightwight python image that is compatible with Flask
FROM python:3.11-slim

WORKDIR /app
COPY . .

RUN python -m venv /ChatBot_env
ENV PATH="/ChatBot_env/bin:$PATH"
ENV PYTHONPATH=/app


COPY requirements.txt .
RUN pip install --upgrade pip
RUN pip install -r requirements.txt

ENV chatbot_APP=chatbot/app.py


EXPOSE 5000

CMD ["/ChatBot_env/bin/python", "main.py"]

# docker build -t chatbot-app -f docker/Dockerfile .
# docker run -p 5000:5000 --name chatbot-app chatbot-app