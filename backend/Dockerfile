# Use a slim Python image for Flask
FROM python:3.12-slim

WORKDIR /app

# Create and activate a virtual environment
RUN python -m venv /ChatBot_env
ENV PATH="/ChatBot_env/bin:$PATH"
ENV PYTHONPATH=/app

COPY requirements.txt .
RUN pip install --upgrade pip
RUN pip install -r requirements.txt

COPY . .

# Set environment to production
ENV FLASK_ENV=production

EXPOSE 5000

# Run the main file
CMD ["python", "main.py"]
