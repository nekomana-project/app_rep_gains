import { Ionicons } from '@expo/vector-icons';
import { Text, TouchableOpacity, View } from 'react-native';
import { styles } from '../app/styles'; // Assuming you extracted styles earlier
import { Workout } from '../app/types';

interface WorkoutCardProps {
  item: Workout;
  userWeightUnit: string;
  onEdit: (workout: Workout) => void;
  onDelete: (id: string) => void;
}

export default function WorkoutCard({ item, userWeightUnit, onEdit, onDelete }: WorkoutCardProps) {
  return (
    <View style={styles.workoutCard}>
      <View style={styles.cardAccentBar} />
      <View style={styles.workoutInfo}>
        <Text style={styles.workoutName}>{item.name}</Text>
        <Text style={styles.workoutStats}>
          <Text style={styles.statHighlight}>{item.sets}</Text> sets × <Text style={styles.statHighlight}>{item.reps}</Text> reps
        </Text>
        <View style={{flexDirection: 'row', gap: 10, marginBottom: 10}}>
          <View style={styles.measurementTag}>
            <Ionicons name={item.unit === 'lbs/kg' ? "barbell" : "time"} size={14} color="#4361EE" />
            <Text style={styles.measurementTagText}>
              @ <Text style={styles.statHighlightBold}>{item.value}</Text> {item.unit === 'lbs/kg' ? userWeightUnit : item.unit}
            </Text>
          </View>
          {item.calories > 0 && (
            <View style={[styles.measurementTag, {backgroundColor: '#FFF0F0'}]}>
              <Text style={{fontSize: 12}}>🔥</Text>
              <Text style={[styles.measurementTagText, {color: '#EF233C'}]}>
                <Text style={styles.statHighlightBold}>{item.calories}</Text> kcal
              </Text>
            </View>
          )}
        </View>
        <View style={styles.dateRow}>
          <Ionicons name="calendar-outline" size={12} color="#8D99AE" />
          <Text style={styles.workoutDate}>{item.date}</Text>
        </View>
      </View>
      <View style={styles.cardActionsContainer}>
        <TouchableOpacity style={styles.editActionBtn} onPress={() => onEdit(item)}>
          <Ionicons name="pencil" size={18} color="#FFF" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteActionBtn} onPress={() => onDelete(item.id)}>
          <Ionicons name="trash" size={18} color="#FFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
}