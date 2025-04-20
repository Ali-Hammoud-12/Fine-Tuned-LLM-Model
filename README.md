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

Create a `.env` file in the `/app` directory and populate it based on `.env.template`:

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
```