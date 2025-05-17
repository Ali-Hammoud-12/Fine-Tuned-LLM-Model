# 🧠 Fine-Tuned LLM Model

## Overview

This project implements a chatbot application powered by **Google's Gemini 1.5 Flash** model. It’s fine-tuned for educational and conversational use cases, integrates seamlessly with AWS services, and is optimized for both cost and performance.

---

## 📁 Project Structure

```
FINE-TUNED-LLM-MODEL/
├── .aws/               # AWS configuration
├── .github/            # GitHub Actions workflows
├── .vscode/            # VS Code settings
├── backend/            # Flask-based API for chatbot
├── docker/             # Dockerfiles and configurations
├── frontend/           # Next.js frontend (chat UI)
├── scripts/            # Helper scripts for automation
├── tests/              # Unit and integration tests
├── .gitignore          
├── README.md
```

---

## 🚀 Getting Started

You can run the application either **locally** or **remotely on AWS ECS**.

---

### 🖥️ Run Locally

#### Step 1: Clone the Repository

```bash
git clone https://github.com/Ali-Hammoud-12/Fine-Tuned-LLM-Model.git
cd Fine-Tuned-LLM-Model
```

#### Step 2: Set Up Environment Variables

Create a `.env` file in the `/backend` directory and populate it based on `.env.template`:

```bash
GOOGLE_APPLICATION_CREDENTIALS=./client-google-services.json
GEMINI_API_KEY=Get_From_Google_AI_Studio  # Not used anymore
AWS_ACCESS_KEY=Get_From_AWS_IAM_Users
AWS_SECRET_ACCESS_KEY=Get_From_AWS_IAM_Users
```

#### Step 3.1: Run Backend with Python

```bash
cd backend
python main.py
```

#### Step 3.2: Run Backend with Docker

```bash
docker build -t chatbot-app -f Dockerfile .
docker run -p 5000:5000 --name chatbot-backend --env-file backend/.env chatbot-backend
```

#### Step 4: Run Frontend (Next.js)

#### Step 4.1: Run Frontend with Next.JS

```bash
cd frontend
npm install
npm run dev
```

Open your browser at: [http://localhost:3000](http://localhost:3000)

You can start editing the page by modifying:

```
frontend/app/page.tsx
```

The page auto-updates as you edit the file. This project uses `next/font` to automatically optimize and load Inter, a custom Google Font.

#### Step 4.2: Run Frontend with Docker

```bash
docker build -t chatbot-app -f Dockerfile .
docker run -p 3000:3000 --name chatbot-frontend --env-file frontend/.env.production -e NODE_ENV=production chatbot-frontend
```

---

### ☁️ Run Remotely (AWS ECS)

#### Step 1: Trigger CI/CD Pipeline

Use the **GitHub Actions** workflow:
- Go to **Actions > ChatBot App CI/CD Pipeline**
- Run the workflow and select the branch to deploy to AWS ECS.

#### Step 2: Scale Auto Scaling Group

In the AWS Console:
- Navigate to **Auto Scaling Groups**
- Set **desired instances** to `1` and update.

#### Step 3: Deploy Updated ECS Service

- Go to your **AWS ECS Service**
- Force a new deployment to use the latest task definition
- Set **desired task count** to `1`

#### Step 4: Access via Load Balancer

Visit the chatbot using the DNS endpoint:

```
http://chatbot-load-balancer-1450166938.eu-west-3.elb.amazonaws.com/
```

---

## 💡 Cost Optimization with Gemini API

**Important Note:** This project aims to minimize API token costs by utilizing:
- **Gemini 2.0 Flash-Lite** for text generation
- **Imagen 3** for image generation
- Lower image quality and size settings

If you wish to enhance output quality, consider the following adjustments:

### Text Generation

```python
response = gemini.chat(
    model="gemini-2.5-pro", 
    messages=messages,
    max_tokens=512,
    temperature=0.8,
)
```

### Image Generation Example

```python
response = gemini.image.generate(
    model="imagen-3", 
    prompt=prompt,
    size="1024x1024",  
    quality="high",    
)
```

⚠️ *Be aware that higher-quality outputs will incur additional costs.*

---

## 💰 Gemini API Pricing Overview (as of 01-12-2024)

### Text Generation (Per 1M Tokens)

| Model                  | Input Price | Output Price |
|------------------------|-------------|--------------|
| Gemini 2.0 Flash       | $0.10       | $0.40        |
| Gemini 2.0 Flash-Lite  | $0.075      | $0.30        |
| Gemini 2.5 Pro         | $1.25       | $10.00       |

### Image Generation

| Model     | Price per Image |
|-----------|-----------------|
| Imagen 3  | $0.03           |

### Video Generation

| Model | Price per Second |
|-------|------------------|
| Veo 2 | $0.35            |

*Refer to the [Gemini API Pricing](https://ai.google.dev/gemini-api/docs/pricing) for up-to-date details.*

---

## 🧠 Troubleshooting Tips

### Issues with Fine-Tuned Models

- **Verify Model ID:** Ensure the model ID (e.g., `ftjob-xxxxxxxxx`) is correct.
- **Check Access Permissions:** Confirm your API key has access to the fine-tuned models via the Google Cloud console.
- **Model Status:** Ensure the fine-tuned model is active and not paused.
- **Try Alternate Models:** Temporarily test with base Gemini models to isolate the issue.

### Dataset Collection Issues

- **Dataset Collection ID:** Ensure correctness and existence of the ID.
- **Check JSONL Format:** Validate proper syntax and structure.
- **Improve Sources:** Use structured data from LIU and official academic portals.

---