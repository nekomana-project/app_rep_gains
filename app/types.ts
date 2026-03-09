export type Workout = { 
  id: string; 
  name: string; 
  sets: string; 
  reps: string; 
  value: string; 
  unit: 'lbs/kg' | 'sec' | 'min' | 'hr'; 
  date: string; 
  calories: number; 
  isManualCals?: boolean; 
};

export type ExerciseDef = { 
  name: string; 
  met: number; 
};

export const DEFAULT_EXERCISES: ExerciseDef[] = [
  { name: 'Bench Press', met: 5.0 }, { name: 'Squat', met: 6.0 }, { name: 'Deadlift', met: 6.0 },
  { name: 'Plank', met: 4.0 }, { name: 'Running', met: 8.0 }, { name: 'HIIT Session', met: 8.0 },
  { name: 'Pull-ups', met: 6.0 }, { name: 'Push-ups', met: 4.0 }, { name: 'Bicep Curls', met: 3.0 }
];