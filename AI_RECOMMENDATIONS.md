# AI Recommendations System

## Overview

The AI recommendation system analyzes your workout performance to provide intelligent suggestions for progressive overload, regardless of whether your program was AI-generated or manually created.

## How It Works

### Analysis Triggers
- **Automatic**: After completing any workout (from any program type)
- **Data-Driven**: Analyzes actual performance data from completed sets
- **Program-Agnostic**: Works for both AI-generated and custom manual programs

### What Gets Analyzed

For each exercise in a completed workout:

1. **Current Performance**
   - Weight used
   - Reps completed per set
   - Number of sets completed
   - Average reps across all sets

2. **Historical Context**
   - Last 20 workouts containing this exercise
   - Progression trends
   - Performance consistency

3. **Recommendation Logic**

```javascript
// From src/services/ai.js - getAIRecommendations()

if (avgReps >= 12 && sets >= 3) {
  // Increase weight by 5%
  recommendation = {
    type: 'increase_weight',
    message: 'Time to increase the weight',
    suggested_weight: currentWeight * 1.05
  }
}

else if (avgReps < 6) {
  // Decrease weight by 10%
  recommendation = {
    type: 'decrease_weight',
    message: 'Reduce weight to stay in hypertrophy range',
    suggested_weight: currentWeight * 0.90
  }
}

else if (sets < 3) {
  // Increase volume
  recommendation = {
    type: 'increase_volume',
    message: 'Add more sets for optimal growth'
  }
}
```

## Recommendation Types

### 1. Increase Weight
- **Trigger**: Consistently hitting 12+ reps across 3+ sets
- **Action**: Increase weight by ~5%
- **Goal**: Progressive overload for continued muscle growth

### 2. Decrease Weight
- **Trigger**: Average reps below 6
- **Action**: Reduce weight by ~10%
- **Goal**: Stay in optimal hypertrophy range (8-12 reps)

### 3. Increase Volume
- **Trigger**: Fewer than 3 sets completed
- **Action**: Add more sets (aim for 3-4 per exercise)
- **Goal**: Sufficient training volume for muscle growth

## Program Type Independence

### Why It Works for Both Program Types

The recommendation system analyzes **workout execution**, not program design:

```
AI-Generated Program → Workout Session → Sets Logged → AI Analysis
Custom Program      → Workout Session → Sets Logged → AI Analysis
```

**Key Point**: AI recommendations examine your actual performance (weight, reps, sets) regardless of where the workout structure came from.

### Benefits for Custom Programs

When you create a manual program:
- ✅ Full AI analysis on every workout
- ✅ Personalized progression suggestions
- ✅ Same recommendation quality as AI programs
- ✅ Learn optimal weight progression over time

## Data Flow

```
1. User completes workout
2. Sets are saved to database (with weight, reps)
3. AI service triggered on workout completion
4. Historical data retrieved (last 20 workouts per exercise)
5. Performance analyzed
6. Recommendations generated and saved
7. User sees recommendations in analytics
```

## Technical Implementation

### Database Tables Involved
- `workouts` - Workout sessions
- `workout_exercises` - Exercises in each workout
- `sets` - Individual set data (weight, reps)
- `ai_recommendations` - Generated suggestions

### API Endpoint
```
POST /api/workouts/:id/complete
- Marks workout as completed
- Triggers AI recommendation generation
- Returns recommendations
```

### Key Function
```javascript
// src/services/ai.js
export async function getAIRecommendations(db, ai, userId, workoutId)
```

This function:
- Queries all exercises from the workout
- Gets historical performance data
- Applies recommendation logic
- Saves to `ai_recommendations` table

## Best Practices

### For AI-Generated Programs
- Follow the structured progression
- Track your performance honestly
- Adjust based on recommendations

### For Custom Programs
- Start with manageable weights
- Track performance for at least 2-3 workouts per exercise
- Use recommendations to optimize your progression
- Don't ignore "decrease weight" suggestions - proper form > ego

## Viewing Recommendations

Recommendations appear in:
1. **Analytics Tab** - View all recommendations
2. **After Workout Completion** - Immediate feedback
3. **Exercise History** - Historical recommendations per exercise

## Progressive Overload Strategy

The AI implements a scientifically-backed approach:

1. **Master Current Weight**
   - Hit 3-4 sets consistently
   - Achieve 12+ reps with good form

2. **Increase Resistance**
   - Add 5% more weight
   - Drop back to 8-10 rep range

3. **Build Back Up**
   - Work toward 12+ reps again
   - Repeat cycle

This approach ensures:
- Continuous muscle adaptation
- Reduced injury risk
- Long-term sustainable progress
- Optimal hypertrophy stimulus

## Conclusion

Whether you let AI design your program or build it yourself, you get the same intelligent progression guidance based on your actual performance. The system adapts to YOUR unique strength curve and recovery capacity, making every program optimized for YOUR progress.
