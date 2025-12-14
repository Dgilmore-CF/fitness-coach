# Muscle Map Visualization - AI Generation Guide

This document outlines strategies for creating professional anatomical muscle diagrams using AI image generation tools.

## Overview

The fitness app requires high-quality muscle visualization diagrams that are:
- Anatomically accurate
- Professional/medical-grade appearance
- Highlightable by muscle group
- Consistent style across all views
- Clean and modern design

## Recommended AI Image Generation Tools

### 1. Midjourney v6 (Highly Recommended)

**Why It's Best:**
- Exceptional anatomical accuracy when prompted correctly
- Consistent style across generations
- High-resolution outputs (up to 2048x2048)
- Clean, professional medical illustration style
- Best for vector-like, simplified anatomy

**API/Discord Bot Commands:**

Midjourney uses Discord commands. Here are complete command examples:

**Front View (Anterior) - Full Body:**
```
/imagine prompt: anatomical muscle diagram, front view male body, clean medical illustration style, flat design, labeled muscle groups highlighted, professional textbook quality, white background, symmetrical, detailed musculature, vector art style, educational anatomy poster, high contrast muscle boundaries, no text labels --style raw --v 6.1 --ar 2:3 --s 250 --c 10 --q 2
```

**Back View (Posterior) - Full Body:**
```
/imagine prompt: human body muscle anatomy posterior view, medical textbook illustration, clear muscle definition, professional healthcare diagram, clean lines, color-coded muscle groups, educational poster style, white background, symmetrical stance, detailed back muscles trapezius latissimus dorsi, vector illustration --style raw --v 6.1 --ar 2:3 --s 250 --c 10 --q 2
```

**Individual Muscle Overlay (Transparent):**
```
/imagine prompt: isolated pectoralis major muscle illustration, medical diagram style, transparent background, anatomically accurate chest muscle, front view, clean vector edges, professional medical quality, no body outline just the muscle --style raw --v 6.1 --ar 1:1 --s 200 --c 5 --q 2
```

**Parameter Reference:**
| Parameter | Value | Purpose |
|-----------|-------|--------|
| `--v 6.1` | Version 6.1 | Latest model with best anatomy |
| `--ar 2:3` | Aspect ratio | Portrait orientation for full body |
| `--s 250` | Stylize | Lower = more literal to prompt |
| `--c 10` | Chaos | Low = more consistent results |
| `--q 2` | Quality | Highest quality generation |
| `--style raw` | Raw mode | Less artistic interpretation |

### 2. DALL-E 3 (Via ChatGPT Plus or API)

**Why It's Good:**
- Best text-to-image understanding
- Consistent character/body proportions
- Easy iteration and refinement
- Can generate with transparency
- Good at following complex instructions

**Full API Request Examples:**

**Front View (Anterior) - Full Body:**
```javascript
const response = await fetch('https://api.openai.com/v1/images/generations', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${OPENAI_API_KEY}`
  },
  body: JSON.stringify({
    model: 'dall-e-3',
    prompt: 'Create a professional medical illustration showing front view (anterior) of human muscular system. Style: clean anatomical textbook diagram with accurate muscle groups including pectoralis major, deltoids, biceps, rectus abdominis, obliques, and quadriceps. The illustration should have a pure white background, symmetrical anatomical body position, and clearly defined muscle boundaries with subtle color differentiation between muscle groups. Make it look like a professional healthcare educational poster with subtle shading to show muscle depth. Vector art style with clean edges suitable for SVG conversion. No text or labels.',
    n: 1,
    size: '1024x1792',
    quality: 'hd',
    style: 'natural',
    response_format: 'url'
  })
});
```

**Back View (Posterior) - Full Body:**
```javascript
const response = await fetch('https://api.openai.com/v1/images/generations', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${OPENAI_API_KEY}`
  },
  body: JSON.stringify({
    model: 'dall-e-3',
    prompt: 'Generate an anatomical posterior view diagram showing back muscles including trapezius, latissimus dorsi, rhomboids, erector spinae, posterior deltoids, triceps, gluteus maximus, hamstrings, and calves. Style: medical textbook illustration with clean lines, professional coloring with subtle differentiation between muscle groups, and anatomically accurate proportions. Pure white background, educational healthcare poster quality. Vector art style with clean defined edges. No text or labels.',
    n: 1,
    size: '1024x1792',
    quality: 'hd',
    style: 'natural',
    response_format: 'url'
  })
});
```

**Individual Muscle Overlay:**
```javascript
const response = await fetch('https://api.openai.com/v1/images/generations', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${OPENAI_API_KEY}`
  },
  body: JSON.stringify({
    model: 'dall-e-3',
    prompt: 'Create an isolated illustration of the pectoralis major (chest) muscle only, shown from front view. Medical diagram style with anatomically accurate shape and fiber direction. The muscle should be colored in a solid blue (#3b82f6) with subtle shading for depth. Transparent/white background with no body outline - just the isolated muscle. Clean vector-style edges suitable for SVG tracing.',
    n: 1,
    size: '1024x1024',
    quality: 'hd',
    style: 'natural',
    response_format: 'url'
  })
});
```

**Parameter Reference:**
| Parameter | Options | Recommended |
|-----------|---------|-------------|
| `model` | `dall-e-3`, `dall-e-2` | `dall-e-3` |
| `size` | `1024x1024`, `1024x1792`, `1792x1024` | `1024x1792` for full body |
| `quality` | `standard`, `hd` | `hd` for medical detail |
| `style` | `vivid`, `natural` | `natural` for accuracy |
| `response_format` | `url`, `b64_json` | `url` for direct download |

### 3. Leonardo AI (Best for Consistency)

**Why It's Great:**
- Can train custom models on your style
- Consistent output across multiple generations
- ControlNet for precise positioning
- Canvas editing for refinements
- Free tier available

**Workflow:**
1. Generate base anatomical illustration
2. Use "Image to Image" to maintain consistency
3. Generate separate muscle group overlays
4. Combine in design tool

**Full API Request Examples:**

**Front View (Anterior) - Full Body:**
```javascript
const response = await fetch('https://cloud.leonardo.ai/api/rest/v1/generations', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${LEONARDO_API_KEY}`
  },
  body: JSON.stringify({
    prompt: 'medical anatomy illustration, human body muscular system anterior view, professional textbook style, flat design, clean white background, symmetrical posture, detailed muscle definition including pectoralis deltoids biceps quadriceps abs, educational poster quality, vector art style, clean muscle boundaries, anatomically accurate proportions',
    negative_prompt: 'cartoon, anime, sketch, low quality, blurry, deformed anatomy, text, labels, watermark, signature, extra limbs, disfigured',
    modelId: '6bef9f1b-29cb-40c7-b9df-32b51c1f67d3', // Leonardo Creative
    width: 832,
    height: 1216,
    num_images: 4,
    guidance_scale: 7,
    num_inference_steps: 30,
    presetStyle: 'ILLUSTRATION',
    scheduler: 'EULER_DISCRETE',
    sd_version: 'SDXL_1_0',
    alchemy: true,
    photoReal: false,
    contrastRatio: 0.5,
    highResolution: true
  })
});
```

**Back View (Posterior) - Full Body:**
```javascript
const response = await fetch('https://cloud.leonardo.ai/api/rest/v1/generations', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${LEONARDO_API_KEY}`
  },
  body: JSON.stringify({
    prompt: 'anatomical diagram back view, posterior muscle groups, trapezius deltoids latissimus dorsi rhomboids erector spinae gluteus hamstrings calves, medical illustration style, clean professional design, white background, educational healthcare poster, vector art, clean defined edges, symmetrical stance',
    negative_prompt: 'cartoon, anime, sketch, low quality, blurry, deformed anatomy, text, labels, watermark, front view, face visible',
    modelId: '6bef9f1b-29cb-40c7-b9df-32b51c1f67d3',
    width: 832,
    height: 1216,
    num_images: 4,
    guidance_scale: 7,
    num_inference_steps: 30,
    presetStyle: 'ILLUSTRATION',
    scheduler: 'EULER_DISCRETE',
    sd_version: 'SDXL_1_0',
    alchemy: true,
    photoReal: false,
    highResolution: true
  })
});
```

**Individual Muscle with ControlNet (Image-to-Image):**
```javascript
const response = await fetch('https://cloud.leonardo.ai/api/rest/v1/generations', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${LEONARDO_API_KEY}`
  },
  body: JSON.stringify({
    prompt: 'isolated biceps muscle illustration, medical diagram style, blue color (#3b82f6), anatomically accurate arm muscle, clean vector edges, transparent background, no body outline',
    negative_prompt: 'full body, other muscles, skeleton, cartoon, blurry',
    modelId: '6bef9f1b-29cb-40c7-b9df-32b51c1f67d3',
    width: 512,
    height: 512,
    num_images: 4,
    guidance_scale: 8,
    num_inference_steps: 40,
    presetStyle: 'ILLUSTRATION',
    init_image_id: '<previous_generation_id>', // For consistency
    init_strength: 0.3,
    alchemy: true,
    transparentBackground: true
  })
});
```

**Parameter Reference:**
| Parameter | Recommended | Purpose |
|-----------|-------------|--------|
| `modelId` | Leonardo Creative | Best for illustrations |
| `guidance_scale` | 7-8 | Higher = more prompt adherence |
| `num_inference_steps` | 30-40 | More steps = higher quality |
| `presetStyle` | `ILLUSTRATION` | Clean vector-like output |
| `alchemy` | `true` | Enhanced quality pipeline |
| `highResolution` | `true` | Upscaled output |
| `transparentBackground` | `true` | For overlays |

### 4. Stable Diffusion XL (SD-XL) - Best for Control

**Why Consider It:**
- Full control over generation
- Can use ControlNet for exact positioning
- Can fine-tune on specific anatomy datasets
- Free and open-source
- Can generate transparent backgrounds

**Recommended Model:** Realistic Vision XL + Medical Illustrations LoRA

**Full API Request Examples (via Automatic1111 API or ComfyUI):**

**Front View (Anterior) - txt2img API:**
```javascript
const response = await fetch('http://localhost:7860/sdapi/v1/txt2img', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    prompt: 'professional anatomical muscle diagram, medical textbook illustration, anterior view human body, clean vector style, accurate musculature, educational poster, white background, high detail, symmetrical, (medical illustration:1.3), (clean lines:1.2), (anatomically correct:1.4), pectoralis major, deltoids, biceps, rectus abdominis, quadriceps, detailed muscle fibers, professional healthcare diagram',
    negative_prompt: 'cartoon, anime, sketch, low quality, blurry, deformed anatomy, extra limbs, disfigured, bad proportions, watermark, text, labels, nsfw, nude',
    sampler_name: 'DPM++ 2M Karras',
    scheduler: 'Karras',
    steps: 30,
    cfg_scale: 7.5,
    width: 832,
    height: 1216,
    seed: -1,
    batch_size: 1,
    n_iter: 4,
    restore_faces: false,
    enable_hr: true,
    hr_scale: 2,
    hr_upscaler: 'R-ESRGAN 4x+',
    hr_second_pass_steps: 15,
    denoising_strength: 0.4,
    override_settings: {
      sd_model_checkpoint: 'realisticVisionV60B1_v51VAE.safetensors',
      CLIP_stop_at_last_layers: 2
    },
    alwayson_scripts: {
      ADetailer: {
        args: [{
          ad_model: 'face_yolov8n.pt',
          ad_confidence: 0.3
        }]
      }
    }
  })
});
```

**Back View (Posterior) - txt2img API:**
```javascript
const response = await fetch('http://localhost:7860/sdapi/v1/txt2img', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    prompt: 'professional anatomical muscle diagram, medical textbook illustration, posterior view human body, back muscles, trapezius, latissimus dorsi, rhomboids, erector spinae, gluteus maximus, hamstrings, calves, clean vector style, accurate musculature, educational poster, white background, high detail, symmetrical, (medical illustration:1.3), (clean lines:1.2), (anatomically correct:1.4)',
    negative_prompt: 'cartoon, anime, sketch, low quality, blurry, deformed anatomy, front view, face visible, extra limbs, watermark, text',
    sampler_name: 'DPM++ 2M Karras',
    scheduler: 'Karras',
    steps: 30,
    cfg_scale: 7.5,
    width: 832,
    height: 1216,
    seed: -1,
    batch_size: 1,
    n_iter: 4,
    enable_hr: true,
    hr_scale: 2,
    hr_upscaler: 'R-ESRGAN 4x+',
    hr_second_pass_steps: 15,
    denoising_strength: 0.4
  })
});
```

**With ControlNet (Pose-Guided Generation):**
```javascript
const response = await fetch('http://localhost:7860/sdapi/v1/txt2img', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    prompt: 'professional anatomical muscle diagram, medical textbook illustration, anterior view, clean vector style, (medical illustration:1.3)',
    negative_prompt: 'cartoon, anime, sketch, low quality, blurry, deformed',
    sampler_name: 'DPM++ 2M Karras',
    steps: 30,
    cfg_scale: 7.5,
    width: 832,
    height: 1216,
    alwayson_scripts: {
      controlnet: {
        args: [{
          enabled: true,
          module: 'openpose_full',
          model: 'control_v11p_sd15_openpose',
          weight: 1.0,
          resize_mode: 'Crop and Resize',
          lowvram: false,
          processor_res: 512,
          guidance_start: 0.0,
          guidance_end: 1.0,
          control_mode: 'Balanced',
          input_image: '<base64_encoded_pose_image>'
        }]
      }
    }
  })
});
```

**Replicate API (Cloud-hosted SD-XL):**
```javascript
const response = await fetch('https://api.replicate.com/v1/predictions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Token ${REPLICATE_API_TOKEN}`
  },
  body: JSON.stringify({
    version: 'stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b',
    input: {
      prompt: 'professional anatomical muscle diagram, medical textbook illustration, anterior view human body, clean vector style, accurate musculature, educational poster, white background, high detail, symmetrical, medical illustration, clean lines',
      negative_prompt: 'cartoon, anime, sketch, low quality, blurry, deformed anatomy',
      width: 832,
      height: 1216,
      num_outputs: 4,
      scheduler: 'K_EULER',
      num_inference_steps: 30,
      guidance_scale: 7.5,
      refine: 'expert_ensemble_refiner',
      high_noise_frac: 0.8,
      apply_watermark: false
    }
  })
});
```

**Parameter Reference:**
| Parameter | Recommended | Purpose |
|-----------|-------------|--------|
| `sampler_name` | `DPM++ 2M Karras` | Best quality/speed balance |
| `steps` | 30-40 | More = higher quality |
| `cfg_scale` | 7-8 | Prompt adherence strength |
| `enable_hr` | `true` | High-resolution upscaling |
| `hr_scale` | 2 | 2x upscale factor |
| `denoising_strength` | 0.3-0.5 | For img2img/upscaling |

## Generation Strategy

### Option A: Generate Layered Components

Generate 3 separate images per view:

**1. Base body outline (DALL-E 3):**
```javascript
{
  model: 'dall-e-3',
  prompt: 'Simple human body outline silhouette, front view, clean minimal line art, pure white background, professional medical illustration style, symmetrical anatomical position, no muscles shown just body shape outline, vector art style with clean black lines',
  size: '1024x1792',
  quality: 'hd',
  style: 'natural'
}
```

**2. Individual muscle group overlays (generate separately for each muscle):**
```javascript
// Example for Pectoralis Major
{
  model: 'dall-e-3',
  prompt: 'Isolated pectoralis major muscle illustration only, medical diagram style, transparent background, the muscle colored in solid blue (#3b82f6), anatomically accurate chest muscle shape with fiber direction visible, front view, only this muscle group visible with no body outline, clean vector edges suitable for SVG conversion',
  size: '1024x1024',
  quality: 'hd',
  style: 'natural'
}

// Example for Quadriceps
{
  model: 'dall-e-3', 
  prompt: 'Isolated quadriceps muscle group illustration only, medical diagram style, transparent background, the muscles colored in solid orange (#f59e0b), anatomically accurate showing rectus femoris vastus lateralis vastus medialis, front view, only these muscles visible with no body outline, clean vector edges',
  size: '1024x1024',
  quality: 'hd',
  style: 'natural'
}
```

**3. Complete muscle map reference:**
```javascript
{
  model: 'dall-e-3',
  prompt: 'Full anatomical muscle diagram showing all major muscle groups, professional medical textbook quality, color-coded by region (chest blue, shoulders green, arms purple, core pink, legs orange), front view, pure white background, ultra detailed with clear muscle boundaries, educational poster quality, no text labels',
  size: '1024x1792',
  quality: 'hd',
  style: 'natural'
}
```

### Option B: Generate Complete Diagrams

**Front View (Midjourney):**
```
/imagine prompt: professional anatomical muscle chart, anterior view full body, medical education poster style, clean illustration with clearly separated muscle groups including pectoralis deltoids biceps quadriceps abs, each muscle group has distinct boundaries for easy identification, white background, symmetrical human anatomy, textbook quality illustration, ultra HD, professional healthcare diagram, vector art style --style raw --v 6.1 --ar 2:3 --s 200 --q 2
```

**Back View (Midjourney):**
```
/imagine prompt: professional anatomical muscle chart, posterior view full body, medical education poster style, clean illustration showing trapezius latissimus dorsi gluteus hamstrings calves triceps, each muscle clearly defined with boundaries, white background, symmetrical, textbook quality, ultra HD, vector art clean edges --style raw --v 6.1 --ar 2:3 --s 200 --q 2
```

## Post-Generation Workflow

### 1. Vector Tracing (For SVG Conversion)

Convert generated images to SVG for web use:

**Tools:**
- **Adobe Illustrator** - Image Trace
- **Inkscape** (Free) - Trace Bitmap
- **VectorMagic** - Online conversion

### 2. Add Interactivity

Once converted to SVG:
- Import traced SVG into code
- Add unique IDs to each muscle path
- Apply CSS classes for highlighting
- Add `data-muscle` attributes for identification

### 3. Color Coding in Code

```javascript
const muscleColors = {
  'chest': '#3b82f6',
  'shoulders': '#10b981',
  'back': '#ef4444',
  'legs': '#f59e0b',
  'arms': '#8b5cf6',
  'core': '#ec4899'
};
```

### 4. CSS Styling for Highlights

```css
.muscle {
  fill: #cbd5e1;
  transition: fill 0.3s, filter 0.3s;
}

.muscle.active {
  fill: #3b82f6;
  filter: drop-shadow(0 0 10px rgba(59, 130, 246, 0.8));
}

.muscle:hover {
  cursor: pointer;
  opacity: 0.8;
}
```

## Implementation Steps

1. **Generate 2 base diagrams** (front + back views)
2. **Generate 8-10 muscle group overlays** per view
3. **Convert to SVG** using vector tracing tools
4. **Layer in code** with CSS transitions
5. **Add glow effects** with `filter: drop-shadow()`
6. **Implement tooltips** showing muscle names on hover

## Muscle Groups to Generate

### Front View (Anterior)
- Pectoralis Major (Chest)
- Anterior Deltoid (Front Shoulders)
- Biceps
- Forearms
- Rectus Abdominis (Abs)
- Obliques
- Quadriceps
- Tibialis Anterior (Shins)

### Back View (Posterior)
- Trapezius
- Posterior Deltoid (Rear Shoulders)
- Latissimus Dorsi (Lats)
- Rhomboids
- Erector Spinae (Lower Back)
- Triceps
- Gluteus Maximus
- Hamstrings
- Calves (Gastrocnemius)

## Alternative Solutions

If AI generation doesn't meet quality requirements:

### Professional SVG Illustrations (Paid)
- **GraphicRiver** - Search "muscle anatomy diagram SVG"
- **Adobe Stock** - "anatomical muscle illustration"
- **Envato Elements** - Medical anatomy graphics ($16.50/month subscription)
- **Freepik Premium** - Medical anatomy graphics

### Open Source Options
- **BodyParts3D/Anatomography** - Free medical illustrations
- **OpenAnatomy** - Open-source anatomical models
- **Human-body-diagram** NPM package

### 3D Solutions (Advanced)
- **BioDigital Human API** - Medical-grade 3D anatomy ($1,200-$5,000/year)
- **Three.js with GLTF models** - Custom 3D muscle models
- **Zygote Body** - Interactive 3D models
