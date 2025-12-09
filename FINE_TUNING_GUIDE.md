# Fine-Tuning Llama 3 for Fitness Program Generation

## Option C: Custom Fine-Tuning Implementation

### ⚠️ Current Limitation

**Cloudflare Workers AI does NOT currently support custom fine-tuning.** Workers AI provides access to pre-trained models only. You cannot upload custom fine-tuned models to Cloudflare's infrastructure.

However, there are several viable alternatives to achieve similar quality improvements:

---

## Alternative 1: LoRA Fine-Tuning + External Hosting (Recommended)

### Overview
Fine-tune Llama 3 8B with LoRA (Low-Rank Adaptation) and deploy to a service that Workers can call.

### Architecture
```
Cloudflare Worker → External API (LoRA Model) → Your Fine-Tuned Llama 3
                 ↓
              Fallback to Workers AI if external fails
```

### Step-by-Step Implementation

#### 1. Collect Training Data

Create a dataset of high-quality fitness programs:

```json
// training_data.jsonl
{"prompt": "Create a 4-day hypertrophy program for Upper Push, Lower, Upper Pull, Lower split.\n\nAvailable exercises:\nChest: Bench Press, Incline Press, Cable Fly\nBack: Deadlift, Row, Lat Pulldown\n...", "completion": "{\"name\": \"4-Day Upper/Lower Split\", \"days\": [{\"day_number\": 1, \"name\": \"Upper Push\", \"exercises\": [{\"name\": \"Bench Press\", \"sets\": 4, \"reps\": \"8-10\"}...]}...}"}
{"prompt": "...", "completion": "..."}
```

**Dataset Requirements**:
- Minimum 100 examples for basic fine-tuning
- 500-1000 examples for production quality
- 2000+ examples for optimal performance

**Example Training Data Structure**:
```python
# generate_training_data.py
import json

training_examples = [
    {
        "prompt": """Create a 3-day hypertrophy program.

UPPER BODY EXERCISES:
Chest: Barbell Bench Press, Cable Chest Fly
Back: Barbell Deadlift, Cable Lat Pulldown
Shoulders: Smith Machine Overhead Press
Biceps: Barbell Curl
Triceps: Cable Tricep Pushdown

LOWER BODY EXERCISES:
Legs: Smith Machine Squat, Barbell Squat
Quads: Leg Extension
Hamstrings: Leg Curl
Glutes: Barbell Hip Thrust
Calves: Smith Machine Calf Raise

Create proper 3-day split: Full Body, Upper, Lower""",
        "completion": json.dumps({
            "name": "3-Day Full Body / Upper / Lower Split",
            "days": [
                {
                    "day_number": 1,
                    "name": "Full Body",
                    "focus": "Compound Movements",
                    "muscle_groups": ["Full Body"],
                    "exercises": [
                        {"name": "Barbell Squat", "sets": 4, "reps": "8-10", "rest_seconds": 120},
                        {"name": "Barbell Bench Press", "sets": 4, "reps": "8-10", "rest_seconds": 120},
                        {"name": "Barbell Deadlift", "sets": 3, "reps": "6-8", "rest_seconds": 180},
                        {"name": "Cable Lat Pulldown", "sets": 3, "reps": "10-12", "rest_seconds": 90},
                        {"name": "Smith Machine Overhead Press", "sets": 3, "reps": "8-10", "rest_seconds": 90}
                    ]
                },
                # ... more days
            ]
        })
    },
    # ... 100-1000 more examples
]

# Save to JSONL
with open('fitness_training.jsonl', 'w') as f:
    for example in training_examples:
        f.write(json.dumps(example) + '\n')
```

#### 2. Fine-Tune Llama 3 with LoRA

**Using Hugging Face + LoRA**:

```python
# fine_tune_llama3.py
from transformers import AutoModelForCausalLM, AutoTokenizer, TrainingArguments
from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training
from datasets import load_dataset
from trl import SFTTrainer

# Load base model
model_name = "meta-llama/Meta-Llama-3-8B-Instruct"
model = AutoModelForCausalLM.from_pretrained(
    model_name,
    load_in_8bit=True,
    device_map="auto"
)
tokenizer = AutoTokenizer.from_pretrained(model_name)

# LoRA configuration
lora_config = LoraConfig(
    r=16,  # Low rank
    lora_alpha=32,
    target_modules=["q_proj", "v_proj", "k_proj", "o_proj"],
    lora_dropout=0.05,
    bias="none",
    task_type="CAUSAL_LM"
)

# Prepare model for training
model = prepare_model_for_kbit_training(model)
model = get_peft_model(model, lora_config)

# Load training data
dataset = load_dataset('json', data_files='fitness_training.jsonl', split='train')

# Training arguments
training_args = TrainingArguments(
    output_dir="./llama3-fitness-lora",
    num_train_epochs=3,
    per_device_train_batch_size=4,
    gradient_accumulation_steps=4,
    learning_rate=2e-4,
    fp16=True,
    save_steps=100,
    logging_steps=10,
    optim="paged_adamw_8bit"
)

# Format function
def format_prompt(example):
    return f"<|begin_of_text|><|start_header_id|>user<|end_header_id|>\n{example['prompt']}<|eot_id|><|start_header_id|>assistant<|end_header_id|>\n{example['completion']}<|eot_id|>"

# Train
trainer = SFTTrainer(
    model=model,
    train_dataset=dataset,
    args=training_args,
    formatting_func=format_prompt,
    max_seq_length=2048
)

trainer.train()
model.save_pretrained("./llama3-fitness-lora-final")
```

**Hardware Requirements**:
- GPU: NVIDIA A100 (40GB) or better
- Training time: 2-8 hours depending on dataset size
- Cost: ~$10-50 on RunPod, Lambda Labs, or vast.ai

#### 3. Deploy Fine-Tuned Model

**Option A: Hugging Face Inference Endpoints**

```python
# Deploy to Hugging Face
from huggingface_hub import create_inference_endpoint

endpoint = create_inference_endpoint(
    name="fitness-coach-llama3",
    repository="your-username/llama3-fitness-lora",
    framework="pytorch",
    task="text-generation",
    instance_type="gpu-medium",
    instance_size="x1",
    region="us-east-1"
)

# Get endpoint URL: https://YOUR_ENDPOINT.endpoints.huggingface.cloud
```

**Pricing**: ~$0.60/hour = ~$432/month for 24/7 availability

**Option B: Modal.com (Serverless GPU)**

```python
# modal_deploy.py
import modal

stub = modal.Stub("fitness-coach-llama3")

@stub.function(
    gpu="A10G",
    image=modal.Image.debian_slim().pip_install(
        "transformers", "peft", "torch", "accelerate"
    ),
    timeout=300
)
def generate_program(prompt: str) -> str:
    from transformers import AutoModelForCausalLM, AutoTokenizer
    from peft import PeftModel
    
    # Load base + LoRA
    base_model = AutoModelForCausalLM.from_pretrained(
        "meta-llama/Meta-Llama-3-8B-Instruct",
        device_map="auto"
    )
    model = PeftModel.from_pretrained(base_model, "./llama3-fitness-lora-final")
    tokenizer = AutoTokenizer.from_pretrained("meta-llama/Meta-Llama-3-8B-Instruct")
    
    # Generate
    inputs = tokenizer(prompt, return_tensors="pt").to("cuda")
    outputs = model.generate(**inputs, max_new_tokens=2048)
    return tokenizer.decode(outputs[0], skip_special_tokens=True)

@stub.local_entrypoint()
def main():
    prompt = "Create a 4-day program..."
    result = generate_program.remote(prompt)
    print(result)
```

**Pricing**: Pay per second of GPU usage (~$0.001/second = $0.60/request)

**Option C: Replicate.com**

```python
# Upload model to Replicate
# Follow: https://replicate.com/docs/guides/push-a-model

# Then call from Worker
const response = await fetch('https://api.replicate.com/v1/predictions', {
    method: 'POST',
    headers: {
        'Authorization': `Token ${REPLICATE_API_TOKEN}`,
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        version: "your-model-version-id",
        input: { prompt: "Create a 4-day program..." }
    })
});
```

**Pricing**: ~$0.10-0.30 per generation

#### 4. Update Cloudflare Worker

```javascript
// src/services/ai.js

export async function generateProgram(ai, { user, days_per_week, goal, exercises }) {
  const prompt = buildPrompt(user, days_per_week, goal, exercises);
  
  try {
    // Try custom fine-tuned model first
    const customResponse = await callFineTunedModel(prompt);
    if (customResponse && customResponse.quality > 0.8) {
      return parseProgram(customResponse.text);
    }
  } catch (error) {
    console.log('Fine-tuned model unavailable, falling back to Workers AI');
  }
  
  // Fallback to Cloudflare Workers AI
  const response = await ai.run('@cf/meta/llama-3-8b-instruct', {
    prompt,
    max_tokens: 2048
  });
  
  return parseProgram(response.response);
}

async function callFineTunedModel(prompt) {
  // Option: Hugging Face Inference Endpoint
  const response = await fetch('https://YOUR_ENDPOINT.endpoints.huggingface.cloud', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${HF_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      inputs: prompt,
      parameters: { max_new_tokens: 2048, temperature: 0.7 }
    })
  });
  
  if (!response.ok) throw new Error('Fine-tuned model failed');
  return await response.json();
}
```

---

## Alternative 2: Few-Shot Learning (No Fine-Tuning Required)

### Overview
Provide 2-3 high-quality examples IN the prompt itself. Llama 3 learns the pattern.

### Implementation

```javascript
export async function generateProgram(ai, { user, days_per_week, goal, exercises }) {
  const prompt = `You are a professional strength coach. Generate workout programs in this exact format:

EXAMPLE 1 - 3-day program:
${JSON.stringify(exampleProgram3Day, null, 2)}

EXAMPLE 2 - 4-day program:
${JSON.stringify(exampleProgram4Day, null, 2)}

EXAMPLE 3 - 5-day program:
${JSON.stringify(exampleProgram5Day, null, 2)}

Now create a ${days_per_week}-day ${goal} program following the EXACT format above.

User: ${user.weight_kg}kg, ${user.age}yo

AVAILABLE EXERCISES:
${formatExerciseList(exercises)}

CRITICAL RULES:
1. UPPER BODY DAYS: Only Chest, Back, Shoulders, Biceps, Triceps exercises
2. LOWER BODY DAYS: Only Legs, Quads, Hamstrings, Glutes, Calves exercises
3. Match the JSON structure EXACTLY as shown in examples

Generate the program:`;

  const response = await ai.run('@cf/meta/llama-3-8b-instruct', {
    prompt,
    max_tokens: 2048,
    temperature: 0.3  // Lower temperature for more consistent output
  });
  
  return parseProgram(response.response);
}

const exampleProgram3Day = {
  name: "3-Day Full Body Split",
  days: [
    {
      day_number: 1,
      name: "Full Body A",
      focus: "Compound Movements",
      muscle_groups: ["Full Body"],
      exercises: [
        { name: "Barbell Squat", sets: 4, reps: "8-10", rest_seconds: 120 },
        { name: "Barbell Bench Press", sets: 4, reps: "8-10", rest_seconds: 120 },
        { name: "Barbell Deadlift", sets: 3, reps: "6-8", rest_seconds: 180 },
        { name: "Cable Lat Pulldown", sets: 3, reps: "10-12", rest_seconds: 90 },
        { name: "Cable Lateral Raise", sets: 3, reps: "12-15", rest_seconds: 60 }
      ]
    }
    // ... more days
  ]
};
```

**Benefits**:
- ✅ No fine-tuning needed
- ✅ No external APIs
- ✅ $0 cost
- ✅ Immediate implementation

**Drawbacks**:
- ⚠️ Uses more tokens per request
- ⚠️ Quality not as good as true fine-tuning
- ⚠️ Still requires validation layer

---

## Alternative 3: Prompt Chaining with Validation

### Overview
Break program generation into multiple AI calls with validation at each step.

### Implementation

```javascript
export async function generateProgram(ai, { user, days_per_week, goal, exercises }) {
  // Step 1: Generate program structure
  const structurePrompt = `Create a ${days_per_week}-day ${goal} split structure.
Output only the day names and focus areas. Format: JSON array of {day_number, name, focus, muscle_groups}`;
  
  const structure = await ai.run('@cf/meta/llama-3-8b-instruct', {
    prompt: structurePrompt,
    max_tokens: 512
  });
  
  const days = JSON.parse(structure.response);
  
  // Step 2: For each day, generate exercises
  for (const day of days) {
    const isDayUpper = day.muscle_groups.some(mg => 
      ['Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps'].includes(mg)
    );
    const isDayLower = day.muscle_groups.some(mg => 
      ['Legs', 'Quads', 'Hamstrings', 'Glutes', 'Calves'].includes(mg)
    );
    
    const validExercises = exercises.filter(ex => {
      if (isDayUpper) return ['Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps'].includes(ex.muscle_group);
      if (isDayLower) return ['Legs', 'Quads', 'Hamstrings', 'Glutes', 'Calves'].includes(ex.muscle_group);
      return true; // Full body
    });
    
    const exercisePrompt = `Select exactly 5 exercises for ${day.name} (${day.focus}) from this list:
${validExercises.map(e => `- ${e.name} (${e.muscle_group})`).join('\n')}

Output JSON array of {name, sets, reps, rest_seconds}. Compound exercises first.`;
    
    const exercisesResponse = await ai.run('@cf/meta/llama-3-8b-instruct', {
      prompt: exercisePrompt,
      max_tokens: 512
    });
    
    day.exercises = JSON.parse(exercisesResponse.response);
  }
  
  return { name: `${days_per_week}-Day ${goal} Program`, days };
}
```

**Benefits**:
- ✅ Better quality through constraints
- ✅ No external services
- ✅ $0 cost
- ✅ Exercises pre-filtered by body part

**Drawbacks**:
- ⚠️ Multiple AI calls = slower (5-10 calls per program)
- ⚠️ More complex error handling

---

## Alternative 4: Hybrid Approach (Best of All Worlds)

### Implementation

```javascript
export async function generateProgram(ai, { user, days_per_week, goal, exercises }) {
  let programData;
  
  // Try 1: Custom fine-tuned model (if available)
  if (env.FINETUNED_MODEL_URL) {
    try {
      programData = await callFineTunedModel(prompt);
      if (validateProgram(programData)) return programData;
    } catch (e) {
      console.log('Fine-tuned model failed, trying few-shot');
    }
  }
  
  // Try 2: Few-shot with Workers AI
  try {
    programData = await generateWithFewShot(ai, { user, days_per_week, goal, exercises });
    if (validateProgram(programData)) return programData;
  } catch (e) {
    console.log('Few-shot failed, trying prompt chaining');
  }
  
  // Try 3: Prompt chaining with validation
  try {
    programData = await generateWithChaining(ai, { user, days_per_week, goal, exercises });
    if (validateProgram(programData)) return programData;
  } catch (e) {
    console.log('All AI methods failed, using template');
  }
  
  // Fallback: Template
  return generateTemplateProgram(days_per_week);
}
```

---

## Cost-Benefit Analysis

| Approach | Quality | Cost | Speed | Complexity |
|----------|---------|------|-------|------------|
| **Fine-tuning (External)** | ⭐⭐⭐⭐⭐ | $$$$ | Fast | High |
| **Few-Shot Learning** | ⭐⭐⭐⭐ | Free | Fast | Low |
| **Prompt Chaining** | ⭐⭐⭐⭐ | Free | Slow | Medium |
| **Current + Validation** | ⭐⭐⭐ | Free | Fast | Low |
| **Hybrid** | ⭐⭐⭐⭐⭐ | $-$$$ | Fast | High |

---

## Recommendation

### For Your Use Case:

**Phase 1**: Few-Shot Learning (Implement today)
- Add 2-3 perfect example programs to prompt
- Cost: $0
- Expected quality: 85-90%
- Implementation time: 2 hours

**Phase 2**: Monitor & Decide (After 100+ users)
- If quality < 85%: Implement fine-tuning
- If quality > 85%: Stay with few-shot
- Track: Program quality score, user satisfaction, validation corrections

**Phase 3**: Fine-Tuning (If needed)
- Collect real user data as training set
- Fine-tune on Modal.com (serverless = cost-effective)
- Deploy as primary with Workers AI fallback
- Expected quality: 95%+

---

## Quick Start: Few-Shot Implementation

I can implement Alternative 2 (Few-Shot Learning) right now. It requires:
1. Creating 3 perfect example programs
2. Updating the prompt to include them
3. Lowering temperature for consistency
4. Testing with various day counts

This would take ~30 minutes and cost $0 to deploy.

Would you like me to implement the few-shot approach now, or would you prefer to go straight to fine-tuning with external hosting?
