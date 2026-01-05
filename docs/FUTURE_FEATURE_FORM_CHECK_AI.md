# Form Check AI Using Computer Vision

> **Status**: Planned for future implementation  
> **Created**: December 28, 2025  
> **Priority**: TBD

---

## Overview

AI-powered form checking using computer vision to analyze exercise form in real-time and provide feedback to users on proper technique.

---

## Technical Approaches

### Option 1: Client-Side Pose Estimation (Recommended for MVP)

Use **TensorFlow.js with MoveNet or BlazePose** running in the browser:

- **Pros**: No server costs, privacy-friendly (video stays on device), real-time
- **Cons**: Limited to device processing power, less accurate than server-side
- **Libraries**: `@tensorflow-models/pose-detection`

```javascript
// Example: Detect 17 body keypoints in real-time
const detector = await poseDetection.createDetector(
  poseDetection.SupportedModels.MoveNet
);
const poses = await detector.estimatePoses(videoElement);
```

### Option 2: Server-Side with External APIs

Use specialized pose estimation APIs:

- Google MediaPipe API
- AWS Rekognition
- Azure Computer Vision

**Trade-offs**: Higher latency, ongoing API costs, but more accurate

### Option 3: Hybrid Approach

- Client-side pose detection (keypoint extraction)
- Server-side form analysis using AI to interpret keypoints and provide feedback

---

## Components to Build

| Component | Description | Effort |
|-----------|-------------|--------|
| **Camera Integration** | Access device camera, capture video frames | Low |
| **Pose Detection** | Extract body keypoints (shoulders, elbows, knees, etc.) | Medium |
| **Exercise Recognition** | Identify which exercise is being performed | Medium |
| **Form Rules Engine** | Define correct angles/positions per exercise | High |
| **Real-time Feedback** | Visual overlays + audio cues for corrections | Medium |
| **Rep Counter** | Detect movement patterns to count reps | Medium |

---

## Form Rules Examples

For each exercise, define biomechanical rules based on proper form:

### Squat Rules

```javascript
const SQUAT_RULES = {
  // Knee shouldn't go past toes excessively
  kneeOverToe: { 
    maxAngle: 15, 
    warning: "Knees tracking too far forward" 
  },
  // Back should stay relatively straight
  torsoAngle: { 
    minAngle: 45, 
    warning: "Keep chest up, don't lean too far forward" 
  },
  // Depth check
  hipBelowKnee: { 
    required: true, 
    warning: "Go deeper - hips below knees" 
  },
  // Knee cave detection
  kneeAlignment: { 
    tolerance: 10, 
    warning: "Don't let knees cave inward" 
  }
};
```

### Deadlift Rules

```javascript
const DEADLIFT_RULES = {
  // Back should remain neutral
  spineNeutral: {
    maxDeviation: 15,
    warning: "Keep your back flat, don't round"
  },
  // Bar should stay close to body
  barPath: {
    maxDistance: 5, // cm from shins
    warning: "Keep the bar closer to your body"
  },
  // Hips and shoulders should rise together
  hipShoulderSync: {
    maxDifference: 10,
    warning: "Don't let your hips rise faster than shoulders"
  }
};
```

### Bench Press Rules

```javascript
const BENCH_PRESS_RULES = {
  // Elbows at proper angle
  elbowAngle: {
    idealAngle: 75, // degrees from torso
    tolerance: 15,
    warning: "Tuck elbows slightly, don't flare them out"
  },
  // Bar touches chest
  barToChest: {
    required: true,
    warning: "Lower the bar to your chest"
  },
  // Wrists stacked over elbows
  wristAlignment: {
    maxDeviation: 10,
    warning: "Keep wrists stacked over elbows"
  }
};
```

---

## Body Keypoints Reference (MoveNet)

MoveNet detects 17 keypoints:

```
0: nose
1: left_eye
2: right_eye
3: left_ear
4: right_ear
5: left_shoulder
6: right_shoulder
7: left_elbow
8: right_elbow
9: left_wrist
10: right_wrist
11: left_hip
12: right_hip
13: left_knee
14: right_knee
15: left_ankle
16: right_ankle
```

---

## Implementation Phases

### Phase 1: Foundation (1-2 weeks)
- [ ] Camera access and permissions
- [ ] Basic pose detection integration
- [ ] Visual overlay showing detected keypoints
- [ ] Frame rate optimization

### Phase 2: Form Analysis (2-3 weeks)
- [ ] Implement form rules for priority exercises:
  - [ ] Squat
  - [ ] Deadlift
  - [ ] Bench Press
  - [ ] Overhead Press
  - [ ] Barbell Row
- [ ] Angle calculation utilities
- [ ] Form scoring algorithm

### Phase 3: User Experience (1-2 weeks)
- [ ] Real-time visual feedback (skeleton overlay, color-coded joints)
- [ ] Audio cues for form corrections
- [ ] Rep counting based on movement patterns
- [ ] Session summary with form score

### Phase 4: Analytics & Tracking (1 week)
- [ ] Store form check sessions in database
- [ ] Historical form improvement tracking
- [ ] Common mistakes analysis
- [ ] Progress visualization

---

## Estimated Timeline

**Total: 5-8 weeks for a solid MVP**

---

## Technical Dependencies

```json
{
  "@tensorflow/tfjs": "^4.x",
  "@tensorflow-models/pose-detection": "^2.x"
}
```

CDN alternative for browser:
```html
<script src="https://cdn.jsdelivr.net/npm/@tensorflow/tfjs"></script>
<script src="https://cdn.jsdelivr.net/npm/@tensorflow-models/pose-detection"></script>
```

---

## Key Decisions to Make

1. **Which exercises to support first?**
   - Recommend: Squat, Deadlift, Bench Press (most requested, highest injury risk)

2. **Real-time feedback or post-workout analysis?**
   - Real-time is harder but more valuable for immediate correction

3. **Mobile-first or desktop?**
   - Mobile has camera built-in but less processing power
   - Desktop allows larger display for feedback

4. **Privacy approach?**
   - Recommend: Client-side processing only (video never leaves device)
   - Optional: User can choose to upload clips for AI coach review

---

## Resources & References

- [TensorFlow.js Pose Detection](https://github.com/tensorflow/tfjs-models/tree/master/pose-detection)
- [MoveNet Documentation](https://blog.tensorflow.org/2021/05/next-generation-pose-detection-with-movenet-and-tensorflowjs.html)
- [MediaPipe Pose](https://google.github.io/mediapipe/solutions/pose.html)
- [Biomechanics of Squats](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC6050697/)

---

## Notes

_Add implementation notes and decisions here as the feature progresses._
