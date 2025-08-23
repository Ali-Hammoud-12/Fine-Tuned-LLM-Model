# LIU Chatbot Constraint System Implementation

## Overview

This document describes the implementation of a constraint system for the LIU (Lebanese International University) fine-tuned chatbot that ensures the model only answers questions related to LIU-specific topics and provides fallback responses for out-of-scope queries.

## Problem Statement

The user wanted to force the fine-tuned model to:
1. Only answer questions about LIU-related topics it was trained on
2. Provide a generic fallback response when asked about topics outside its training scope
3. Prevent the model from using its general knowledge to answer non-LIU questions

## Solution Components

### 1. Pre-Filtering System (`is_liu_related_question`)

**Location:** `backend/utils/services.py`

The pre-filtering system catches obvious non-LIU questions before they reach the model, improving efficiency and reliability.

#### LIU-Related Keywords
Uses regex patterns with word boundaries to match:
- University identifiers: `liu`, `lebanese international university`
- Academic terms: `admission`, `tuition`, `enrollment`, `mba`, `degree`
- Campus locations: `beirut`, `bekaa`, `saida`, `nabatieh`, etc.
- School names: `business school`, `engineering school`, `pharmacy school`
- Academic concepts: `credits`, `gpa`, `graduation`, `faculty`

#### Non-LIU Pattern Detection
Filters out obvious non-LIU topics:
- Weather, news, sports, politics
- Entertainment (movies, music, games)
- Programming and technology
- Other universities (Harvard, MIT, Stanford)
- Personal advice, health, travel

#### Educational Term Allowance
Allows potentially LIU-related educational questions:
- University, college, education, academic
- Student, teacher, class, exam
- Research, library, thesis

### 2. System Prompt Constraints

**Location:** `backend/utils/services.py` in `generate_fine_tuned_chat_response`

A comprehensive system instruction that:
- Explicitly defines the model's scope (LIU-only information)
- Provides the exact fallback response text
- Lists examples of acceptable and unacceptable questions
- Reinforces constraints multiple times

```python
liu_system_instruction = """You are an educational chatbot specifically trained on LIU (Lebanese International University) information. 

IMPORTANT CONSTRAINTS:
- You can ONLY answer questions about LIU (Lebanese International University)
- Your knowledge is limited to: admissions, academic programs, campus information, tuition, financial aid, registration, faculty, graduation requirements, and university policies at LIU
- If a question is NOT about LIU or is outside your training scope, you MUST respond EXACTLY with: "I apologize, but I can only provide information about LIU (Lebanese International University). I have not been trained to answer questions outside of LIU-specific topics. Please ask me about LIU admissions, programs, campus life, or university policies."
..."""
```

### 3. Fallback Response Implementation

For questions that fail the pre-filter, the system immediately returns:

```
"I apologize, but I can only provide information about LIU (Lebanese International University). I have not been trained to answer questions outside of LIU-specific topics. Please ask me about LIU admissions, programs, campus life, or university policies."
```

### 4. Training Dataset Fix

**Location:** `backend/utils/services.py` in `load_training_dataset`

Fixed the dataset loading function to:
- Use the correct JSONL format (`training-dataset.jsonl`)
- Parse the conversation format with user/model roles
- Handle malformed entries gracefully
- Provide detailed error reporting

## Training Data Scope

The model was trained on 155 examples covering:

### Academic Programs
- Business School (MBA, undergraduate programs)
- Arts & Sciences
- Engineering School
- Pharmacy School
- Education School

### Admissions Information
- Requirements and documents
- Transfer processes
- Application procedures
- Entrance exams

### University Information
- Campus locations (9 domestic, 3 international)
- Faculty information
- Vision and mission statements
- Academic calendar

### Academic Policies
- Credit requirements
- GPA standards
- Financial aid policies
- Registration procedures

## Implementation Benefits

### 1. Dual-Layer Protection
- **Pre-filter:** Catches obvious non-LIU questions immediately
- **System prompt:** Constrains model behavior for edge cases

### 2. Efficiency
- Avoids expensive API calls for obviously irrelevant questions
- Reduces latency for common out-of-scope queries

### 3. Consistency
- Standardized fallback message for all out-of-scope questions
- Predictable behavior across different question types

### 4. Maintainability
- Easy to add new LIU-related keywords
- Clear separation of concerns
- Comprehensive test coverage

## Testing Results

The implementation was tested with 29 different question types:

### ✅ Correctly Identified as LIU-Related
- "What are the admission requirements for LIU?"
- "How many campuses does LIU have?"
- "Tell me about the School of Business at LIU"
- "What is the tuition for MBA program?"
- "Tell me about scholarships"

### ✅ Correctly Filtered Out
- "What's the weather today?"
- "Tell me about Harvard University" 
- "Can you help me with programming?"
- "How to write Python code?"
- "What's the capital of France?"

### ✅ Educational Questions (Allowed Through)
- "What is a university?"
- "How does education work?"
- "What are college requirements?"

## Usage

The constraint system is automatically applied when users interact with the fine-tuned model through the `/tuning-chat` endpoint. No additional configuration is required.

## Future Enhancements

1. **Dynamic Keyword Management:** Allow administrators to add/remove keywords without code changes
2. **Confidence Scoring:** Implement confidence levels for borderline questions
3. **Learning System:** Track frequently asked out-of-scope questions for pattern analysis
4. **Multi-language Support:** Extend constraints to handle questions in Arabic or French

## Code Modifications Summary

### Modified Files
1. `backend/utils/services.py`
   - Enhanced `is_liu_related_question()` with regex patterns and word boundaries
   - Updated `generate_fine_tuned_chat_response()` with system constraints
   - Fixed `load_training_dataset()` to use correct JSONL format

### New Functionality
- Pre-filtering mechanism for question classification
- Comprehensive system prompt engineering
- Immediate fallback response for non-LIU questions
- Improved training dataset loading with error handling

The implementation successfully constrains the LIU chatbot to only answer questions within its trained scope while providing helpful fallback responses for out-of-scope queries.