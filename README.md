# 🧠 Fine-Tuned LLM Model

## Overview

This project implements a chatbot application powered by **Google's Gemini 1.5 Flash** model. It’s fine-tuned for educational and conversational use cases, integrates seamlessly with AWS services, and is optimized for both cost and performance.

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

Create a `.env` file in the `/chatbot` directory and populate it based on `.env.template`:

```bash
GEMINI_API_KEY=Get_From_Google_AI_Studio
AWS_ACCESS_KEY=Get_From_AWS_IAM_Users
AWS_SECRET_ACCESS_KEY=Get_From_AWS_IAM_Users
```

#### Step 3.1: Run with Python

```bash
python main.py
```

#### Step 3.2: Run with Docker

```bash
docker build -t chatbot-app -f docker/Dockerfile .
docker run -p 5000:5000 --name chatbot-app chatbot-app
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

### Image Generation

```python
response = gemini.image.generate(
    model="imagen-3", 
    prompt=prompt,
    size="1024x1024",  
    quality="high",    
)
```

**⚠️ Be aware that higher-quality outputs will incur additional costs.**

---

## 💰 Gemini API Pricing Overview  (as of 01-12-2024)

### Text Generation (Per 1M Tokens)

| Model               | Input Price | Output Price |
|---------------------|-------------|--------------|
| Gemini 2.0 Flash    | $0.10       | $0.40        |
| Gemini 2.0 Flash-Lite | $0.075    | $0.30        |
| Gemini 2.5 Pro      | $1.25       | $10.00       |

### Image Generation

| Model    | Price per Image |
|----------|-----------------|
| Imagen 3 | $0.03           |

### Video Generation

| Model | Price per Second |
|-------|------------------|
| Veo 2 | $0.35            |

*Note: Prices are subject to change. Refer to the [Gemini API Pricing](https://ai.google.dev/gemini-api/docs/pricing) for the most up-to-date information.*

---

## 🧠 Troubleshooting Tips

### Issues with Fine-Tuned Models

- **Verify Model ID:** Ensure the model ID (e.g., `ftjob-xxxxxxxxx`) is correct.
- **Check Access Permissions:** Confirm your API key has access to the fine-tuned models via the OpenAI dashboard.
- **Model Status:** Ensure the fine-tuned model is active and not paused.
- **Test Alternative Models:** Try using a different fine-tuned model to isolate the issue.

### Dataset Collection Issues

- **Dataset Collection ID:** Verify that the dataset collection ID is correct.
- **JSONL Format:** Ensure the `dataset.jsonl` file is correctly formatted.
- **Data Sources:** Consider collecting information from reliable sources, such as the LIU website, to improve dataset quality.

---