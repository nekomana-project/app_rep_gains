import AuthView from '../components/AuthView';
import WorkoutCard from '../components/WorkoutCard';

import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createUserWithEmailAndPassword, deleteUser, sendPasswordResetEmail, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { deleteDoc, doc, getDoc, setDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { Alert, FlatList, Keyboard, KeyboardAvoidingView, Modal, Platform, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { auth, db } from '../firebaseConfig';

// 🔥 NEW IMPORTS: Pull in your extracted files
import { styles } from '../app/styles';
import { TRANSLATIONS } from '../app/translations';
import { DEFAULT_EXERCISES, ExerciseDef, Workout } from '../app/types';

const getLocalToday = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

const DismissKeyboardView = ({ children }: { children: React.ReactNode }) => {
  if (Platform.OS === 'web') return <>{children}</>;
  return <TouchableWithoutFeedback onPress={Keyboard.dismiss}>{children}</TouchableWithoutFeedback>;
};

export default function App() {
  const [appMode, setAppMode] = useState<'gatekeeper' | 'login_form' | 'register_form' | 'offline_app' | 'cloud_app'>('gatekeeper');
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false); 

  const [userWeight, setUserWeight] = useState('');
  const [userWeightUnit, setUserWeightUnit] = useState<'lbs' | 'kg'>('kg');
  
  const [lang, setLang] = useState<'en' | 'nl'>('en');
  const t = TRANSLATIONS[lang]; 

  const [exercise, setExercise] = useState('');
  const [sets, setSets] = useState('');
  const [reps, setReps] = useState('');
  const [measurementValue, setMeasurementValue] = useState(''); 
  
  // 🔥 NEW: SPLIT UNIT STATES 🔥
  const [trackType, setTrackType] = useState<'weight' | 'time'>('weight'); 
  const [timeUnit, setTimeUnit] = useState<'sec' | 'min' | 'hr'>('min'); // Defaulting to minutes
  
  const [workoutDate, setWorkoutDate] = useState(getLocalToday()); 

  const [manualCalories, setManualCalories] = useState('');
  const [isCaloriesOverridden, setIsCaloriesOverridden] = useState(false);

  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterDate, setFilterDate] = useState<string | null>(null);

  const [isDropdownVisible, setIsDropdownVisible] = useState(false);
  const [isDatePickerVisible, setIsDatePickerVisible] = useState(false); 
  const [isCalendarOverviewVisible, setIsCalendarOverviewVisible] = useState(false); 
  const [isSettingsVisible, setIsSettingsVisible] = useState(false); 

  const [exerciseList, setExerciseList] = useState<ExerciseDef[]>(DEFAULT_EXERCISES);
  const [newCustomExercise, setNewCustomExercise] = useState('');
  const [newExerciseIntensity, setNewExerciseIntensity] = useState<number>(5.0); 

  useEffect(() => { loadData(); }, []);

  // 🔥 NEW: WRAPPER TO RESET CALORIE MATH WHEN INPUTS CHANGE
  const handleParamChange = (setter: React.Dispatch<React.SetStateAction<any>>, value: any) => {
    setter(value);
    setIsCaloriesOverridden(false); // If they tweak reps/time, we allow the math to recalculate
  };

  useEffect(() => {
    if (isCaloriesOverridden) return; 
    
    const weightKg = userWeightUnit === 'lbs' ? Number(userWeight) * 0.453592 : Number(userWeight);
    if (!weightKg || !exercise) {
      setManualCalories('');
      return;
    }

    const exDef = exerciseList.find(e => e.name === exercise);
    const met = exDef ? exDef.met : 5.0; 

    let timeInHours = 0;
    
    // 🔥 UPDATED MATH TO HANDLE MIN/HR 🔥
    if (trackType === 'time') {
      if (timeUnit === 'sec') timeInHours = (Number(measurementValue) || 0) / 3600;
      else if (timeUnit === 'min') timeInHours = (Number(measurementValue) || 0) / 60;
      else if (timeUnit === 'hr') timeInHours = Number(measurementValue) || 0;
    } else {
      const s = Number(sets) || 1;
      const r = Number(reps) || 1;
      timeInHours = (s * r * 4) / 3600;
    }

    const calcCals = Math.round(met * weightKg * timeInHours);
    setManualCalories(calcCals > 0 ? calcCals.toString() : '');
  }, [exercise, sets, reps, measurementValue, trackType, timeUnit, exerciseList, userWeight, userWeightUnit, isCaloriesOverridden]);


  const loadData = async (targetMode?: string) => {
    try {
      const user = auth.currentUser;
      const modeToUse = targetMode || appMode;
      
      if (user && modeToUse === 'cloud_app') {
        const docSnap = await getDoc(doc(db, 'users', user.uid));
        if (docSnap.exists()) {
          const data = docSnap.data();
          setWorkouts(data.workouts || []);
          if (data.language) setLang(data.language);
          if (data.userWeight) setUserWeight(data.userWeight);
          if (data.userWeightUnit) setUserWeightUnit(data.userWeightUnit);
          if (data.exercises) setExerciseList(data.exercises.map((e: any) => typeof e === 'string' ? { name: e, met: 5.0 } : e));
          else setExerciseList(DEFAULT_EXERCISES);
        }
      } else {
        const savedWorkouts = await AsyncStorage.getItem('@gym_workouts');
        if (savedWorkouts) setWorkouts(JSON.parse(savedWorkouts));

        const savedExercises = await AsyncStorage.getItem('@custom_exercises');
        if (savedExercises) setExerciseList(JSON.parse(savedExercises).map((e: any) => typeof e === 'string' ? { name: e, met: 5.0 } : e));
        else setExerciseList(DEFAULT_EXERCISES);

        const savedWeight = await AsyncStorage.getItem('@user_weight');
        const savedUnit = await AsyncStorage.getItem('@user_weight_unit');
        if (savedWeight) setUserWeight(savedWeight);
        if (savedUnit === 'lbs' || savedUnit === 'kg') setUserWeightUnit(savedUnit);
      }

      const savedLang = await AsyncStorage.getItem('@app_language');
      if (savedLang === 'nl' || savedLang === 'en') setLang(savedLang);
    } catch (error) { console.error("Error loading data:", error); } 
    finally { setIsDataLoaded(true); }
  };

  const saveProfileData = async (weight: string, unit: 'lbs'|'kg') => {
    try {
      const user = auth.currentUser;
      if (user && appMode === 'cloud_app') {
        await setDoc(doc(db, 'users', user.uid), { userWeight: weight, userWeightUnit: unit }, { merge: true });
      } else {
        await AsyncStorage.setItem('@user_weight', weight);
        await AsyncStorage.setItem('@user_weight_unit', unit);
      }
    } catch (err) { console.error(err); }
  }

  const saveWorkouts = async (updatedWorkoutsArray: Workout[]) => {
    try { 
      const user = auth.currentUser;
      if (user && appMode === 'cloud_app') await setDoc(doc(db, 'users', user.uid), { workouts: updatedWorkoutsArray }, { merge: true });
      else await AsyncStorage.setItem('@gym_workouts', JSON.stringify(updatedWorkoutsArray)); 
    } catch (error) { console.error("Error saving data:", error); }
  };

  const saveExercises = async (updatedList: ExerciseDef[]) => {
    try {
      const user = auth.currentUser;
      if (user && appMode === 'cloud_app') await setDoc(doc(db, 'users', user.uid), { exercises: updatedList }, { merge: true });
      else await AsyncStorage.setItem('@custom_exercises', JSON.stringify(updatedList));
    } catch (error) { console.error("Error saving exercises:", error); }
  };

  const handleLogin = async () => {
    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      Keyboard.dismiss();
      setAppMode('cloud_app');
      await loadData('cloud_app'); 
    } catch (error: any) { Alert.alert(t.errorTitle, t[error.code as keyof typeof t] || error.message); } 
    finally { setIsLoading(false); }
  };

  const handleRegister = async () => {
    setIsLoading(true);
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      Keyboard.dismiss();
      setAppMode('cloud_app');
      setWorkouts([]); 
      saveWorkouts([]); 
    } catch (error: any) { Alert.alert('Registration Error', error.message); } 
    finally { setIsLoading(false); }
  };

  const handleLogout = async () => {
    try { await signOut(auth); setAppMode('gatekeeper'); setEmail(''); setPassword(''); setWorkouts([]); setExerciseList(DEFAULT_EXERCISES); setUserWeight('');
    } catch (error: any) { Alert.alert('Logout Error', error.message); }
  };

  const handleDeleteAccount = () => {
    Alert.alert(t.deleteAccountConfirmTitle, t.deleteAccountConfirmMsg, [
      { text: t.cancel, style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            const user = auth.currentUser;
            if (user) {
              setIsLoading(true);
              await deleteDoc(doc(db, 'users', user.uid));
              await deleteUser(user);
              setAppMode('gatekeeper'); setWorkouts([]); setExerciseList(DEFAULT_EXERCISES);
            }
          } catch (error: any) { Alert.alert(t.errorTitle, error.message); } 
          finally { setIsLoading(false); }
        }
      }
    ]);
  };

  const handleRefresh = async () => { setIsRefreshing(true); await loadData(); setIsRefreshing(false); };
  const handleContinueOffline = () => { setAppMode('offline_app'); loadData('offline_app'); };

  const handleForgotPassword = async () => {
    if (email === '') { Alert.alert(t.errorTitle, t.resetPrompt); return; }
    setIsLoading(true);
    try { await sendPasswordResetEmail(auth, email); Alert.alert(t.resetSentTitle, t.resetSentMsg); } 
    catch (error: any) { Alert.alert(t.errorTitle, error.message); } 
    finally { setIsLoading(false); }
  };

  const toggleLanguage = async () => {
    const newLang = lang === 'en' ? 'nl' : 'en';
    setLang(newLang);
    const user = auth.currentUser;
    if (user && appMode === 'cloud_app') await setDoc(doc(db, 'users', user.uid), { language: newLang }, { merge: true });
    else await AsyncStorage.setItem('@app_language', newLang);
  };

  const handleAddCustomExercise = async () => {
    const trimmedName = newCustomExercise.trim();
    if (trimmedName === '') return;
    if (exerciseList.find(e => e.name.toLowerCase() === trimmedName.toLowerCase())) return;
    
    const updatedList = [{ name: trimmedName, met: newExerciseIntensity }, ...exerciseList];
    setExerciseList(updatedList); 
    setNewCustomExercise(''); 
    setNewExerciseIntensity(5.0); 
    Keyboard.dismiss();
    await saveExercises(updatedList);
  };

  const handleDeleteExerciseItem = (exerciseToRemove: string) => {
    Alert.alert(t.deleteConfirmTitle, t.deleteExerciseMsg, [
      { text: t.cancel, style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
          const updatedList = exerciseList.filter((e) => e.name !== exerciseToRemove);
          setExerciseList(updatedList); 
          await saveExercises(updatedList);
        }
      }
    ]);
  };

  const handleSave = () => {
    if (exercise.trim() === '') return; 
    const finalCalories = Number(manualCalories) || 0;        
    const finalUnit = (trackType === 'weight' ? 'lbs/kg' : timeUnit) as Workout['unit'];    
    let updatedWorkouts;
    if (editingId) {
      updatedWorkouts = workouts.map((w) => w.id === editingId ? { ...w, name: exercise, sets: sets || '0', reps: reps || '0', value: measurementValue || '0', unit: finalUnit, calories: finalCalories, isManualCals: isCaloriesOverridden, date: workoutDate } : w);
    } else {
      updatedWorkouts = [{ id: Date.now().toString(), name: exercise, sets: sets || '0', reps: reps || '0', value: measurementValue || '0', unit: finalUnit, date: workoutDate, calories: finalCalories, isManualCals: isCaloriesOverridden }, ...workouts];
    }
    setWorkouts(updatedWorkouts); saveWorkouts(updatedWorkouts); resetFormState();
  };

  const resetFormState = () => { 
    setExercise(''); setSets(''); setReps(''); setMeasurementValue(''); 
    setTrackType('weight'); setTimeUnit('min'); 
    setManualCalories(''); setIsCaloriesOverridden(false); setEditingId(null); setIsFormVisible(false); setWorkoutDate(getLocalToday()); Keyboard.dismiss(); 
  };
  
  const handleEdit = (workout: Workout) => { 
    setExercise(workout.name); 
    setSets(workout.sets); 
    setReps(workout.reps); 
    setMeasurementValue(workout.value); 
    
    // Parse the unit to properly switch the toggles
    const isTime = workout.unit === 'sec' || workout.unit === 'min' || workout.unit === 'hr';
    setTrackType(isTime ? 'time' : 'weight');
    if (isTime) setTimeUnit(workout.unit as 'sec'|'min'|'hr');
    
    setWorkoutDate(workout.date || getLocalToday()); 
    setManualCalories(workout.calories.toString()); 
    setIsCaloriesOverridden(workout.isManualCals || false); 
    setEditingId(workout.id); 
    setIsFormVisible(true); 
  };
  
  const handleDelete = (idToRemove: string) => {
    Alert.alert(t.deleteConfirmTitle, t.deleteConfirmMsg, [{ text: t.cancel, style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => { const updatedWorkouts = workouts.filter((w) => w.id !== idToRemove); setWorkouts(updatedWorkouts); saveWorkouts(updatedWorkouts); } }]);
  };

  const getMarkedDates = () => {
    const marks: any = {};
    workouts.forEach((w) => { if (w.date && w.date.length === 10) marks[w.date] = { customStyles: { container: { backgroundColor: '#EDF2FF', borderWidth: 2, borderColor: '#4361EE', borderRadius: 12 }, text: { color: '#4361EE', fontWeight: '800' } } }; });
    if (filterDate) marks[filterDate] = { customStyles: { container: { backgroundColor: '#4361EE', borderRadius: 12 }, text: { color: '#FFFFFF', fontWeight: 'bold' } } };
    return marks;
  };

  const displayedWorkouts = filterDate ? workouts.filter((w) => w.date === filterDate) : workouts;
  const dailyCalories = displayedWorkouts.reduce((sum, w) => sum + (w.calories || 0), 0);
  const dailySets = displayedWorkouts.reduce((sum, w) => sum + (Number(w.sets) || 0), 0);

  // ==========================================
  // 🚪 RENDER: AUTH SCREENS
  // ==========================================
  if (appMode === 'gatekeeper' || appMode === 'login_form' || appMode === 'register_form') {
    return (
      <AuthView 
        appMode={appMode} setAppMode={setAppMode}
        email={email} setEmail={setEmail}
        password={password} setPassword={setPassword}
        isLoading={isLoading} handleLogin={handleLogin}
        handleRegister={handleRegister} handleContinueOffline={handleContinueOffline}
        handleForgotPassword={handleForgotPassword} t={t} DismissKeyboardView={DismissKeyboardView}
      />
    );
  }
  
  // ==========================================
  // 🚀 RENDER: ONBOARDING (Weight Check)
  // ==========================================
  if (isDataLoaded && (appMode === 'cloud_app' || appMode === 'offline_app') && userWeight === '') {
    return (
      <DismissKeyboardView>
        <View style={styles.authContainer}>
          <View style={styles.authLogoBox}>
            <Ionicons name="body-outline" size={80} color="#4361EE" />
            <Text style={styles.authTitleText}>{t.onboardingTitle}</Text>
            <Text style={{color: '#8D99AE', marginTop: 10, textAlign: 'center', lineHeight: 22}}>{t.onboardingSub}</Text>
          </View>
          <View style={styles.authFormBox}>
            <Text style={styles.inputLabel}>{t.bodyweight}</Text>
            <View style={{flexDirection: 'row', gap: 10, marginBottom: 20}}>
              <TextInput style={[styles.authInput, {flex: 1, marginBottom: 0}]} placeholder="0" keyboardType="numeric" value={userWeight} onChangeText={setUserWeight} />
              <View style={styles.unitToggleContainerCompact}>
                <TouchableOpacity style={[styles.unitOptionCompact, userWeightUnit === 'kg' && styles.unitOptionActive]} onPress={() => setUserWeightUnit('kg')}><Text style={[styles.unitOptionText, userWeightUnit === 'kg' && styles.unitOptionTextActive]}>kg</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.unitOptionCompact, userWeightUnit === 'lbs' && styles.unitOptionActive]} onPress={() => setUserWeightUnit('lbs')}><Text style={[styles.unitOptionText, userWeightUnit === 'lbs' && styles.unitOptionTextActive]}>lbs</Text></TouchableOpacity>
              </View>
            </View>
            <TouchableOpacity style={styles.authPrimaryBtn} onPress={() => { saveProfileData(userWeight, userWeightUnit); Keyboard.dismiss(); }}>
              <Text style={styles.authPrimaryBtnText}>{t.continueBtn}</Text>
              <Ionicons name="arrow-forward" size={20} color="#FFF" style={{marginLeft: 8}}/>
            </TouchableOpacity>
          </View>
        </View>
      </DismissKeyboardView>
    );
  }

  // ==========================================
  // 📱 RENDER: MAIN APP 
  // ==========================================
  return (    
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} enabled={Platform.OS !== 'web'}>
      <View style={styles.container}>
      
        <View style={styles.headerContainer}>
          <View>
            <Text style={styles.headerTitle}>{t.appTitle}</Text>
            {appMode === 'cloud_app' && (
              <View style={{flexDirection: 'row', alignItems: 'center', marginTop: 4}}><Ionicons name="cloud-done" size={12} color="#10B981" /><Text style={{fontSize: 12, color: '#10B981', marginLeft: 4, fontWeight: '600'}}>Synced to Cloud</Text></View>
            )}
          </View>
          <TouchableOpacity onPress={() => setIsSettingsVisible(true)} style={{padding: 4}}><Ionicons name="settings-outline" size={28} color="#1E293B" /></TouchableOpacity>
        </View>

        {isFormVisible && (
          <DismissKeyboardView>
            <View style={styles.inputCard}>
              <View style={styles.dateSelectorRow}>
                <View style={{flex: 1}}>
                  <Text style={styles.inputLabel}>{t.date}</Text>
                  <TouchableOpacity style={styles.dateSelectorBtn} onPress={() => setIsDatePickerVisible(true)}><Ionicons name="calendar-outline" size={18} color="#4361EE" style={{marginRight: 8}}/><Text style={styles.dateSelectorText}>{workoutDate}</Text></TouchableOpacity>
                </View>
                <View style={{flex: 1, marginLeft: 10}}>
                  <Text style={styles.inputLabel}>{t.exercise}</Text>
                  <TouchableOpacity style={styles.dropdownSelector} onPress={() => setIsDropdownVisible(true)}><Text style={exercise ? styles.dropdownTextActive : styles.dropdownTextPlaceholder} numberOfLines={1}>{exercise ? exercise : t.selectPrompt}</Text><Ionicons name="chevron-down" size={16} color="#8D99AE" /></TouchableOpacity>
                </View>
              </View>

              <View style={styles.row}>
                <View style={styles.halfInputContainer}>
                  <Text style={styles.inputLabel}>{t.sets}</Text>
                  <TextInput style={styles.input} placeholder="3" placeholderTextColor="#A0AABF" keyboardType="numeric" value={sets} onChangeText={(val) => handleParamChange(setSets, val)} />
                </View>
                <View style={styles.halfInputContainer}>
                  <Text style={styles.inputLabel}>{t.reps}</Text>
                  <TextInput style={styles.input} placeholder="10" placeholderTextColor="#A0AABF" keyboardType="numeric" value={reps} onChangeText={(val) => handleParamChange(setReps, val)} />
                </View>
              </View>
              
              <Text style={styles.inputLabel}>{t.trackBy}</Text>
              <View style={styles.unitToggleContainer}>
                <TouchableOpacity style={[styles.unitOption, trackType === 'weight' && styles.unitOptionActive]} onPress={() => handleParamChange(setTrackType, 'weight')}>
                  <Ionicons name="barbell-outline" size={16} color={trackType === 'weight' ? '#FFF' : '#64748B'} style={{marginRight: 6}} />
                  <Text style={[styles.unitOptionText, trackType === 'weight' && styles.unitOptionTextActive]}>{t.weightOption}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.unitOption, trackType === 'time' && styles.unitOptionActive]} onPress={() => handleParamChange(setTrackType, 'time')}>
                  <Ionicons name="timer-outline" size={16} color={trackType === 'time' ? '#FFF' : '#64748B'} style={{marginRight: 6}} />
                  <Text style={[styles.unitOptionText, trackType === 'time' && styles.unitOptionTextActive]}>{t.timeOption}</Text>
                </TouchableOpacity>
              </View>

              {/* 🔥 NEW: SUB-MENU FOR TIME FORMATS 🔥 */}
              {trackType === 'time' && (
                <View style={[styles.unitToggleContainer, {marginTop: -10, marginBottom: 20}]}>
                  <TouchableOpacity style={[styles.unitOption, timeUnit === 'sec' && styles.unitOptionActive]} onPress={() => handleParamChange(setTimeUnit, 'sec')}><Text style={[styles.unitOptionText, timeUnit === 'sec' && styles.unitOptionTextActive]}>{t.secOption}</Text></TouchableOpacity>
                  <TouchableOpacity style={[styles.unitOption, timeUnit === 'min' && styles.unitOptionActive]} onPress={() => handleParamChange(setTimeUnit, 'min')}><Text style={[styles.unitOptionText, timeUnit === 'min' && styles.unitOptionTextActive]}>{t.minOption}</Text></TouchableOpacity>
                  <TouchableOpacity style={[styles.unitOption, timeUnit === 'hr' && styles.unitOptionActive]} onPress={() => handleParamChange(setTimeUnit, 'hr')}><Text style={[styles.unitOptionText, timeUnit === 'hr' && styles.unitOptionTextActive]}>{t.hrOption}</Text></TouchableOpacity>
                </View>
              )}

              <View style={styles.row}>
                <View style={styles.halfInputContainer}>
                  <Text style={styles.inputLabel}>{trackType === 'weight' ? t.weightInput : t.timeInput}</Text>
                  <View style={styles.measurementInputContainer}>
                    <TextInput style={styles.measurementInput} placeholder="0" placeholderTextColor="#A0AABF" keyboardType="numeric" value={measurementValue} onChangeText={(val) => handleParamChange(setMeasurementValue, val)} />
                    <Text style={styles.measurementUnitSuffix}>{trackType === 'weight' ? userWeightUnit : timeUnit}</Text>
                  </View>
                </View>
                <View style={styles.halfInputContainer}>
                   <Text style={[styles.inputLabel, isCaloriesOverridden && {color: '#F59E0B'}]}>{t.caloriesBurned}</Text>
                   <TextInput style={[styles.input, isCaloriesOverridden && {borderColor: '#FDE68A', backgroundColor: '#FFFBEB'}]} placeholder="Auto" placeholderTextColor="#A0AABF" keyboardType="numeric" value={manualCalories} onChangeText={(val) => { setManualCalories(val); setIsCaloriesOverridden(true); }} />
                </View>
              </View>

              <View style={styles.formActionRow}>
                <TouchableOpacity style={styles.cancelButton} onPress={resetFormState}><Text style={styles.cancelButtonText}>{t.cancel}</Text></TouchableOpacity>
                <TouchableOpacity style={styles.saveButton} onPress={handleSave}><Ionicons name={editingId ? "checkmark-circle" : "add-circle"} size={20} color="#FFF" style={{marginRight: 6}} /><Text style={styles.saveButtonText}>{editingId ? t.update : t.save}</Text></TouchableOpacity>
              </View>

            </View>
          </DismissKeyboardView>
        )}

        <View style={styles.listContainer}>
          <View style={styles.listHeaderRow}>
            <Text style={styles.sectionTitle}>{t.history}</Text>
            <View style={{flexDirection: 'row', gap: 10}}>
              {!isFormVisible && (<TouchableOpacity style={[styles.calendarOverviewBtn, filterDate && {backgroundColor: '#4361EE'}]} onPress={() => setIsCalendarOverviewVisible(true)}><Ionicons name="calendar" size={20} color={filterDate ? "#FFF" : "#4361EE"} /></TouchableOpacity>)}
              {!isFormVisible && (<TouchableOpacity style={styles.addButton} onPress={() => setIsFormVisible(true)}><Ionicons name="add" size={20} color="#FFF" /><Text style={styles.addButtonText}>{t.logWorkout}</Text></TouchableOpacity>)}
            </View>
          </View>

          {filterDate && (
            <View style={styles.filterBadgeContainer}>
              <Text style={styles.filterBadgeText}>{t.filteredTo} {filterDate}</Text>
              <TouchableOpacity onPress={() => setFilterDate(null)}><Ionicons name="close-circle" size={22} color="#EF233C" /></TouchableOpacity>
            </View>
          )}

          {displayedWorkouts.length > 0 && (
            <View style={styles.statsContainer}>
              <View style={styles.statBox}><Text style={styles.statBoxLabel}>{t.totalSets}</Text><Text style={styles.statBoxValue}>{dailySets}</Text></View>
              <View style={styles.statBox}><Text style={styles.statBoxLabel}>{t.totalCalories}</Text><Text style={styles.statBoxValue}>🔥 {dailyCalories}</Text></View>
            </View>
          )}
          
          <FlatList
              data={displayedWorkouts} keyExtractor={(item) => item.id} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" refreshing={isRefreshing} onRefresh={handleRefresh}     
              renderItem={({ item }) => (
        // 🔥 Replaced 30 lines of code with this one component
              <WorkoutCard 
                item={item} 
                userWeightUnit={userWeightUnit} 
                onEdit={handleEdit} 
                onDelete={handleDelete} 
              />
            )}
            ListEmptyComponent={<Text style={styles.emptyText}>No workouts found for this date.</Text>}
        />
        </View>

        {isDropdownVisible && (
        <Modal visible={isDropdownVisible} transparent={true} animationType="fade">
          <View style={styles.modalBackground}>
            <View style={[styles.modalContent, { height: '85%' }]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{t.chooseExercise}</Text>
                <TouchableOpacity onPress={() => setIsDropdownVisible(false)}><Ionicons name="close-circle" size={28} color="#8D99AE" /></TouchableOpacity>
              </View>

              <View style={styles.customExerciseCard}>
                <TextInput style={styles.customExerciseInput} placeholder={t.typeNew} placeholderTextColor="#A0AABF" value={newCustomExercise} onChangeText={setNewCustomExercise} />
                <View style={{flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 8}}>
                  <Text style={{fontSize: 12, fontWeight: '700', color: '#8D99AE'}}>{t.intensity}</Text>
                  <TouchableOpacity style={[styles.intensityBtn, newExerciseIntensity === 3.0 && styles.intensityBtnActive]} onPress={() => setNewExerciseIntensity(3.0)}><Text style={[styles.intensityBtnText, newExerciseIntensity === 3.0 && styles.intensityBtnTextActive]}>{t.light}</Text></TouchableOpacity>
                  <TouchableOpacity style={[styles.intensityBtn, newExerciseIntensity === 5.0 && styles.intensityBtnActive]} onPress={() => setNewExerciseIntensity(5.0)}><Text style={[styles.intensityBtnText, newExerciseIntensity === 5.0 && styles.intensityBtnTextActive]}>{t.moderate}</Text></TouchableOpacity>
                  <TouchableOpacity style={[styles.intensityBtn, newExerciseIntensity === 8.0 && styles.intensityBtnActive]} onPress={() => setNewExerciseIntensity(8.0)}><Text style={[styles.intensityBtnText, newExerciseIntensity === 8.0 && styles.intensityBtnTextActive]}>{t.vigorous}</Text></TouchableOpacity>
                </View>
                <TouchableOpacity style={styles.customExerciseBtn} onPress={handleAddCustomExercise}><Text style={{color: '#FFF', fontWeight: '700'}}>{t.save}</Text><Ionicons name="add" size={20} color="#FFF" style={{marginLeft: 4}}/></TouchableOpacity>
              </View>

              <FlatList
                data={exerciseList} style={{ flex: 1 }} keyExtractor={(item) => item.name} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={true}
                renderItem={({ item }) => (
                  <View style={styles.modalItemContainer}>
                    <TouchableOpacity style={styles.modalItemTextContainer} onPress={() => { handleParamChange(setExercise, item.name); setIsDropdownVisible(false); }}>
                      <Text style={styles.modalItemText}>{item.name}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDeleteExerciseItem(item.name)} style={{padding: 10}}><Ionicons name="trash-outline" size={20} color="#EF233C" /></TouchableOpacity>
                  </View>
                )}
              />
            </View>
          </View>
        </Modal>
        )}

        <Modal visible={isDatePickerVisible} transparent={true} animationType="fade">
          <View style={styles.modalBackground}>
            <View style={[styles.modalContent, {padding: 10}]}>
              <Calendar current={workoutDate} markingType={'custom'} markedDates={{ [workoutDate]: { customStyles: { container: { backgroundColor: '#4361EE', borderRadius: 12 }, text: { color: '#FFFFFF', fontWeight: 'bold' } } } }} onDayPress={(day: any) => { setWorkoutDate(day.dateString); setIsDatePickerVisible(false); }} theme={{ todayTextColor: '#4361EE', arrowColor: '#4361EE' }} />
              <TouchableOpacity style={styles.modalCloseButton} onPress={() => setIsDatePickerVisible(false)}><Text style={styles.modalCloseText}>{t.cancel}</Text></TouchableOpacity>
            </View>
          </View>
        </Modal>

        <Modal visible={isCalendarOverviewVisible} transparent={true} animationType="fade">
          <View style={styles.modalBackground}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{t.calendarOverview}</Text>
                <TouchableOpacity onPress={() => setIsCalendarOverviewVisible(false)}><Ionicons name="close-circle" size={28} color="#8D99AE" /></TouchableOpacity>
              </View>
              <Calendar markingType={'custom'} markedDates={getMarkedDates()} onDayPress={(day: any) => { setFilterDate(day.dateString); setIsCalendarOverviewVisible(false); }} theme={{ todayTextColor: '#4361EE', arrowColor: '#4361EE' }} />
              <TouchableOpacity style={styles.modalCloseButton} onPress={() => setIsCalendarOverviewVisible(false)}><Text style={styles.modalCloseText}>{t.close}</Text></TouchableOpacity>
            </View>
          </View>
        </Modal>
        
        {isSettingsVisible && (
          <Modal visible={isSettingsVisible} transparent={true} animationType="fade">
            <TouchableWithoutFeedback onPress={() => setIsSettingsVisible(false)}>
              <View style={styles.modalBackground}>
                <TouchableWithoutFeedback>
                  <View style={styles.modalContent}>
                    
                    <View style={styles.modalHeader}>
                      <Text style={styles.modalTitle}>{t.settings}</Text>
                      <TouchableOpacity onPress={() => setIsSettingsVisible(false)}><Ionicons name="close-circle" size={28} color="#8D99AE" /></TouchableOpacity>
                    </View>

                    <TouchableOpacity style={styles.settingsRow} onPress={toggleLanguage}>
                      <View style={{flexDirection: 'row', alignItems: 'center'}}><Ionicons name="language-outline" size={24} color="#4361EE" style={{marginRight: 12}} /><Text style={styles.settingsRowText}>{t.language}</Text></View>
                      <Text style={styles.settingsRowValue}>{lang === 'en' ? '🇬🇧 English' : '🇳🇱 Nederlands'}</Text>
                    </TouchableOpacity>

                    <View style={styles.profileSection}>
                      <Text style={styles.dangerZoneTitle}>{t.myProfile}</Text>
                      <View style={{flexDirection: 'row', gap: 10, alignItems: 'center'}}>
                        <TextInput style={[styles.input, {flex: 1, marginBottom: 0}]} keyboardType="numeric" value={userWeight} onChangeText={setUserWeight} />
                        <View style={styles.unitToggleContainerCompact}>
                          <TouchableOpacity style={[styles.unitOptionCompact, userWeightUnit === 'kg' && styles.unitOptionActive]} onPress={() => setUserWeightUnit('kg')}><Text style={[styles.unitOptionText, userWeightUnit === 'kg' && styles.unitOptionTextActive]}>kg</Text></TouchableOpacity>
                          <TouchableOpacity style={[styles.unitOptionCompact, userWeightUnit === 'lbs' && styles.unitOptionActive]} onPress={() => setUserWeightUnit('lbs')}><Text style={[styles.unitOptionText, userWeightUnit === 'lbs' && styles.unitOptionTextActive]}>lbs</Text></TouchableOpacity>
                        </View>
                        <TouchableOpacity style={{backgroundColor: '#1E293B', padding: 12, borderRadius: 12}} onPress={() => { saveProfileData(userWeight, userWeightUnit); Alert.alert('Saved!', 'Profile updated.'); Keyboard.dismiss(); }}><Ionicons name="checkmark" size={20} color="#FFF" /></TouchableOpacity>
                      </View>
                    </View>

                    {appMode === 'cloud_app' ? (
                      <>
                        <TouchableOpacity style={styles.settingsRow} onPress={() => { setIsSettingsVisible(false); handleLogout(); }}>
                          <View style={{flexDirection: 'row', alignItems: 'center'}}><Ionicons name="log-out-outline" size={24} color="#64748B" style={{marginRight: 12}} /><Text style={styles.settingsRowText}>{t.logout}</Text></View>
                        </TouchableOpacity>
                        <View style={styles.dangerZone}>
                          <Text style={styles.dangerZoneTitle}>{t.dangerZone}</Text>
                          <TouchableOpacity style={styles.deleteAccountBtn} onPress={() => { setIsSettingsVisible(false); handleDeleteAccount(); }}><Ionicons name="trash-outline" size={20} color="#FFF" style={{marginRight: 8}} /><Text style={styles.deleteAccountBtnText}>{t.deleteAccountBtn}</Text></TouchableOpacity>
                        </View>
                      </>
                    ) : (
                      <TouchableOpacity style={styles.settingsRow} onPress={() => { setIsSettingsVisible(false); setAppMode('gatekeeper'); setWorkouts([]); setExerciseList(DEFAULT_EXERCISES); }}>
                        <View style={{flexDirection: 'row', alignItems: 'center'}}><Ionicons name="log-in-outline" size={24} color="#4361EE" style={{marginRight: 12}} /><Text style={styles.settingsRowText}>{t.exitOffline}</Text></View>
                      </TouchableOpacity>
                    )}

                  </View>
                </TouchableWithoutFeedback>
              </View>
            </TouchableWithoutFeedback>
          </Modal>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}