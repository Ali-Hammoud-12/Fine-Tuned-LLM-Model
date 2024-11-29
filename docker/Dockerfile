# A lightwight python image that is compatible with Flask
FROM python:3.10-slim

WORKDIR /app
COPY . .

RUN python -m venv /ChatBot_env
ENV PATH="/ChatBot_env/bin:$PATH"


COPY requirements.txt .
RUN pip install --upgrade pip
RUN pip install -r requirements.txt

ENV chatbot_APP=app/app.py


EXPOSE 5000

CMD ["python", "app/app.py"]

# docker build -t chatbot-app -f docker/Dockerfile .
# docker run -p 5000:5000 --env-file app/.env --name chatbot-app chatbot-app