import AuthView from '../components/AuthView';
import SocialModal from '../components/SocialModal';
import WorkoutCard from '../components/WorkoutCard';

import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createUserWithEmailAndPassword, deleteUser, sendPasswordResetEmail, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { deleteDoc, doc, getDoc, setDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { Alert, Dimensions, FlatList, Keyboard, KeyboardAvoidingView, Modal, Platform, ScrollView, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { BarChart } from 'react-native-chart-kit'; // 🔥 NEW IMPORT
import { auth, db } from '../firebaseConfig';

import { styles } from '../constants/styles';
import { TRANSLATIONS } from '../constants/translations';
import { DEFAULT_EXERCISES, ExerciseDef, Workout } from '../constants/types';

const getLocalToday = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const generateFriendCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 5; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
  return result;
};
const screenWidth = Dimensions.get("window").width;

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
  const [showOnboarding, setShowOnboarding] = useState(false);

  // 🔥 NEW SOCIAL STATES
  const [displayName, setDisplayName] = useState('');
  const [friendCode, setFriendCode] = useState('');
  const [shareWeight, setShareWeight] = useState(false);
  const [isSocialVisible, setIsSocialVisible] = useState(false);
  
  
  const [lang, setLang] = useState<'en' | 'nl'>('en');
  const t = TRANSLATIONS[lang] as any; 

  const [exercise, setExercise] = useState('');
  const [sets, setSets] = useState('');
  const [reps, setReps] = useState('');
  const [measurementValue, setMeasurementValue] = useState(''); 
  
  const [trackType, setTrackType] = useState<'weight' | 'time'>('weight'); 
  const [timeUnit, setTimeUnit] = useState<'sec' | 'min' | 'hr'>('min'); 
  const [workoutDate, setWorkoutDate] = useState(getLocalToday()); 

  const [manualCalories, setManualCalories] = useState('');
  const [isCaloriesOverridden, setIsCaloriesOverridden] = useState(false);

  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterDate, setFilterDate] = useState<string | null>(null);

  const [isDropdownVisible, setIsDropdownVisible] = useState(false);
  const [isAddCustomVisible, setIsAddCustomVisible] = useState(false); // 🔥 NEW STATE
  const [isDatePickerVisible, setIsDatePickerVisible] = useState(false); 
  const [isCalendarOverviewVisible, setIsCalendarOverviewVisible] = useState(false); 
  const [isSettingsVisible, setIsSettingsVisible] = useState(false); 

  // 🔥 NEW: CHART STATES 🔥
  const [isChartVisible, setIsChartVisible] = useState(false);
  const [chartDays, setChartDays] = useState<7 | 30>(7);

  const [exerciseList, setExerciseList] = useState<ExerciseDef[]>(DEFAULT_EXERCISES);
  const [newCustomExercise, setNewCustomExercise] = useState('');
  const [newExerciseIntensity, setNewExerciseIntensity] = useState<number>(5.0); 

  // 🔥 NEW: Cross-platform delete confirmation (fixes Web bugs!)
  const confirmDelete = (title: string, message: string, onConfirm: () => void) => {
    if (Platform.OS === 'web') {
      // Standard browser confirmation
      if (window.confirm(`${title}\n\n${message}`)) {
        onConfirm();
      }
    } else {
      // Native mobile alert
      Alert.alert(title, message, [
        { text: t.cancel || 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: onConfirm }
      ]);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleParamChange = (setter: React.Dispatch<React.SetStateAction<any>>, value: any) => {
    setter(value);
    setIsCaloriesOverridden(false); 
  };

  useEffect(() => {
    if (isCaloriesOverridden) return; 
    
    const weightKg = userWeightUnit === 'lbs' ? Number(userWeight) * 0.453592 : Number(userWeight);
    
    // If they haven't picked an exercise or set their weight yet, keep it completely empty
    if (!weightKg || !exercise) {
      setManualCalories('');
      return;
    }

    const exDef = exerciseList.find(e => e.name === exercise);
    const met = exDef ? exDef.met : 5.0; 

    let timeInHours = 0;
    
    if (trackType === 'time') {
      if (timeUnit === 'sec') timeInHours = (Number(measurementValue) || 0) / 3600;
      else if (timeUnit === 'min') timeInHours = (Number(measurementValue) || 0) / 60;
      else if (timeUnit === 'hr') timeInHours = Number(measurementValue) || 0;
    } else {
      // Changed the fallback to 0 instead of 1. 
      const s = Number(sets) || 0;
      const r = Number(reps) || 0;
      timeInHours = (s * r * 4) / 3600;
    }

    // 🔥 FIXED: Use Math.ceil so even 0.4 calories rounds up to 1!
    const calcCals = Math.ceil(met * weightKg * timeInHours);
    
    // 🔥 FIXED: Show the number even if it calculates to 0, so the user knows it's working!
    setManualCalories(calcCals >= 0 ? calcCals.toString() : '');
    
  }, [exercise, sets, reps, measurementValue, trackType, timeUnit, exerciseList, userWeight, userWeightUnit, isCaloriesOverridden]);


  const loadData = async (targetMode?: string) => {
    try {
      const user = auth.currentUser;
      const modeToUse = targetMode || appMode;
      
      if (user && modeToUse === 'cloud_app') {
        const docSnap = await getDoc(doc(db, 'users', user.uid));
        if (docSnap.exists()) {
          const data = docSnap.data();
          
          const cloudWorkouts = data.workouts || [];
          setWorkouts(cloudWorkouts);
          
          let cloudExercises = DEFAULT_EXERCISES;
          if (data.exercises) {
            cloudExercises = data.exercises.map((e: any) => typeof e === 'string' ? { name: e, met: 5.0 } : e);
          }
          setExerciseList(cloudExercises);

          // 🔥 FIXED: Overwrite local storage with the exact cloud truth so ghosts don't sync
          await AsyncStorage.setItem('@gym_workouts', JSON.stringify(cloudWorkouts));
          await AsyncStorage.setItem('@custom_exercises', JSON.stringify(cloudExercises));

          if (data.language) setLang(data.language);
          if (data.displayName) setDisplayName(data.displayName);
          if (data.friendCode) setFriendCode(data.friendCode);
          if (data.shareWeight !== undefined) setShareWeight(data.shareWeight);

          if (data.userWeight) {
            setUserWeight(data.userWeight);
            if (data.userWeightUnit) setUserWeightUnit(data.userWeightUnit);
            setShowOnboarding(false);
          } else {
            setShowOnboarding(true);
          }
        }
      } else {
        const savedWorkouts = await AsyncStorage.getItem('@gym_workouts');
        if (savedWorkouts) setWorkouts(JSON.parse(savedWorkouts));

        const savedExercises = await AsyncStorage.getItem('@custom_exercises');
        if (savedExercises) setExerciseList(JSON.parse(savedExercises).map((e: any) => typeof e === 'string' ? { name: e, met: 5.0 } : e));
        else setExerciseList(DEFAULT_EXERCISES);

        const savedWeight = await AsyncStorage.getItem('@user_weight');
        const savedUnit = await AsyncStorage.getItem('@user_weight_unit');
        
        if (savedWeight) {
          setUserWeight(savedWeight);
          if (savedUnit === 'lbs' || savedUnit === 'kg') setUserWeightUnit(savedUnit);
          setShowOnboarding(false);
        } else {
          setShowOnboarding(true);
        }
      }

      const savedLang = await AsyncStorage.getItem('@app_language');
      if (savedLang === 'nl' || savedLang === 'en') setLang(savedLang);
    } catch (error) { console.error("Error loading data:", error); } 
    finally { setIsDataLoaded(true); }
  };

  const saveProfileData = async (weight: string, unit: 'lbs'|'kg', name: string, isShared: boolean, code: string) => {
    try {
      const user = auth.currentUser;
      if (user && appMode === 'cloud_app') {
        // If they don't have a code yet, generate one and save it forever
        const finalCode = code || generateFriendCode();
        setFriendCode(finalCode);
        await setDoc(doc(db, 'users', user.uid), { 
          userWeight: weight, userWeightUnit: unit, displayName: name, shareWeight: isShared, friendCode: finalCode 
        }, { merge: true });
      } else {
        await AsyncStorage.setItem('@user_weight', weight);
        await AsyncStorage.setItem('@user_weight_unit', unit);
      }
    } catch (err) { console.error(err); }
  }

  const saveWorkouts = async (updatedWorkoutsArray: Workout[]) => {
    try { 
      const user = auth.currentUser;
      // If online, save to cloud
      if (user && appMode === 'cloud_app') {
        await setDoc(doc(db, 'users', user.uid), { workouts: updatedWorkoutsArray }, { merge: true });
      }
      // 🔥 FIXED: ALWAYS save locally too, so offline storage perfectly mirrors the cloud
      await AsyncStorage.setItem('@gym_workouts', JSON.stringify(updatedWorkoutsArray)); 
    } catch (error) { console.error("Error saving data:", error); }
  };

  const saveExercises = async (updatedList: ExerciseDef[]) => {
    try {
      const user = auth.currentUser;
      if (user && appMode === 'cloud_app') {
        await setDoc(doc(db, 'users', user.uid), { exercises: updatedList }, { merge: true });
      }
      // 🔥 FIXED: ALWAYS save locally
      await AsyncStorage.setItem('@custom_exercises', JSON.stringify(updatedList));
    } catch (error) { console.error("Error saving exercises:", error); }
  };

  // 🔥 NEW: Seamlessly merges local offline data into the cloud!
  const syncLocalWithCloud = async (uid: string) => {
    try {
      const localWorkoutsRaw = await AsyncStorage.getItem('@gym_workouts');
      const localWorkouts = localWorkoutsRaw ? JSON.parse(localWorkoutsRaw) : [];
      const localExercisesRaw = await AsyncStorage.getItem('@custom_exercises');
      const localExercises = localExercisesRaw ? JSON.parse(localExercisesRaw) : [];

      if (localWorkouts.length === 0 && localExercises.length === 0) return; // Nothing to sync

      const docSnap = await getDoc(doc(db, 'users', uid));
      let cloudWorkouts: Workout[] = [];
      let cloudExercises: ExerciseDef[] = [];

      if (docSnap.exists()) {
        const data = docSnap.data();
        cloudWorkouts = data.workouts || [];
        cloudExercises = data.exercises || [];
      }

      // Merge and deduplicate by ID
      const combinedWorkouts = [...cloudWorkouts, ...localWorkouts];
      const uniqueWorkouts = Array.from(new Map(combinedWorkouts.map(item => [item.id, item])).values());
      uniqueWorkouts.sort((a, b) => Number(b.id) - Number(a.id));

      // Merge custom exercises (deduplicate by Name)
      const combinedExercises = [...cloudExercises, ...localExercises];
      const uniqueExercises = Array.from(new Map(combinedExercises.map(item => [item.name.toLowerCase(), item])).values());

      await setDoc(doc(db, 'users', uid), {
        workouts: uniqueWorkouts,
        exercises: uniqueExercises
      }, { merge: true });

    } catch (e) { console.error("Sync error:", e); }
  };

  const handleLogin = async () => {
    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      const user = auth.currentUser;
      
      // 🔥 Run the merge before loading the app
      if (user) await syncLocalWithCloud(user.uid); 
      
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
      const user = auth.currentUser;
      
      // 🔥 Push local data up to the brand new account
      if (user) await syncLocalWithCloud(user.uid);

      Keyboard.dismiss();
      setAppMode('cloud_app');
      setWorkouts([]); 
      saveWorkouts([]); 
      setShowOnboarding(true); 
    } catch (error: any) { Alert.alert('Registration Error', error.message); } 
    finally { setIsLoading(false); }
  };

  const handleLogout = async () => {
    try { await signOut(auth); setAppMode('gatekeeper'); setEmail(''); setPassword(''); setWorkouts([]); setExerciseList(DEFAULT_EXERCISES); setUserWeight('');
    } catch (error: any) { Alert.alert('Logout Error', error.message); }
  };

  const handleDeleteAccount = () => {
    confirmDelete(t.deleteAccountConfirmTitle, t.deleteAccountConfirmMsg, async () => {
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
    });
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
    if (exerciseList.find(e => e.name.toLowerCase() === trimmedName.toLowerCase())) {
      Alert.alert("Already exists", "This exercise is already in your list!");
      return;
    }
    
    const updatedList = [{ name: trimmedName, met: newExerciseIntensity }, ...exerciseList];
    setExerciseList(updatedList); 
    
    // 🔥 AUTO-SELECT AND CLOSE EVERYTHING
    handleParamChange(setExercise, trimmedName);
    setIsAddCustomVisible(false);
    setIsDropdownVisible(false);
    
    setNewCustomExercise(''); 
    setNewExerciseIntensity(5.0); 
    Keyboard.dismiss();
    await saveExercises(updatedList);
  };

  const handleDeleteExerciseItem = (exerciseToRemove: string) => {
    confirmDelete(t.deleteConfirmTitle, t.deleteExerciseMsg, async () => {
      const updatedList = exerciseList.filter((e) => e.name !== exerciseToRemove);
      setExerciseList(updatedList); 
      await saveExercises(updatedList);
    });
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
    confirmDelete(t.deleteConfirmTitle, t.deleteConfirmMsg, () => { 
      const updatedWorkouts = workouts.filter((w) => w.id !== idToRemove); 
      setWorkouts(updatedWorkouts); 
      saveWorkouts(updatedWorkouts); 
    });
  };

  const getMarkedDates = () => {
    const marks: any = {};
    workouts.forEach((w) => { if (w.date && w.date.length === 10) marks[w.date] = { customStyles: { container: { backgroundColor: '#EDF2FF', borderWidth: 2, borderColor: '#4361EE', borderRadius: 12 }, text: { color: '#4361EE', fontWeight: '800' } } }; });
    if (filterDate) marks[filterDate] = { customStyles: { container: { backgroundColor: '#4361EE', borderRadius: 12 }, text: { color: '#FFFFFF', fontWeight: 'bold' } } };
    return marks;
  };

  // 🔥 NEW: CHART DATA GENERATOR 🔥
  const getChartData = () => {
    const labels = [];
    const dataPoints = [];
    const today = new Date();

    // Loop backwards to build an array of dates from oldest to today
    for (let i = chartDays - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

      // If viewing 30 days, showing 30 text labels overlaps. So we only show a label every 5 days.
      let labelText = '';
      if (chartDays === 7) {
        // e.g., "Mon", "Tue"
        labelText = d.toLocaleDateString(lang === 'nl' ? 'nl-NL' : 'en-US', { weekday: 'short' });
      } else {
        // e.g., "12/05"
        if (i % 5 === 0 || i === 0) {
          labelText = `${d.getDate()}/${d.getMonth() + 1}`;
        }
      }

      labels.push(labelText);

      // Sum all calories for this specific date string
      const dayWorkouts = workouts.filter(w => w.date === dateStr);
      const dayCals = dayWorkouts.reduce((sum, w) => sum + (w.calories || 0), 0);
      dataPoints.push(dayCals);
    }

    return {
      labels: labels,
      datasets: [{ data: dataPoints }]
    };
  };

  const displayedWorkouts = filterDate ? workouts.filter((w) => w.date === filterDate) : workouts;
  const dailyCalories = displayedWorkouts.reduce((sum, w) => sum + (w.calories || 0), 0);
  const dailySets = displayedWorkouts.reduce((sum, w) => sum + (Number(w.sets) || 0), 0);

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
  
  if (isDataLoaded && (appMode === 'cloud_app' || appMode === 'offline_app') && showOnboarding) {
    return (
      <DismissKeyboardView>
        <View style={styles.authContainer}>
          <View style={styles.authLogoBox}>
            <Ionicons name="body-outline" size={80} color="#4361EE" />
            <Text style={styles.authTitleText}>{t.onboardingTitle}</Text>
            <Text style={{color: '#8D99AE', marginTop: 10, textAlign: 'center', lineHeight: 22}}>{t.onboardingSub}</Text>
          </View>
          <View style={styles.authFormBox}>
            {appMode === 'cloud_app' && (
              <>
                <Text style={styles.inputLabel}>{t.displayName}</Text>
                <TextInput style={styles.authInput} placeholder="NekoBoi" value={displayName} onChangeText={setDisplayName} maxLength={15} />
              </>
            )}
            
            <Text style={styles.inputLabel}>{t.bodyweight}</Text>
            <View style={{flexDirection: 'row', gap: 10, marginBottom: 20}}>
              <TextInput style={[styles.authInput, {flex: 1, marginBottom: 0}]} placeholder="0" keyboardType="numeric" value={userWeight} onChangeText={setUserWeight} />
              <View style={styles.unitToggleContainerCompact}>
                <TouchableOpacity style={[styles.unitOptionCompact, userWeightUnit === 'kg' && styles.unitOptionActive]} onPress={() => setUserWeightUnit('kg')}><Text style={[styles.unitOptionText, userWeightUnit === 'kg' && styles.unitOptionTextActive]}>kg</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.unitOptionCompact, userWeightUnit === 'lbs' && styles.unitOptionActive]} onPress={() => setUserWeightUnit('lbs')}><Text style={[styles.unitOptionText, userWeightUnit === 'lbs' && styles.unitOptionTextActive]}>lbs</Text></TouchableOpacity>
              </View>
            </View>
            <TouchableOpacity style={styles.authPrimaryBtn} onPress={() => { saveProfileData(userWeight, userWeightUnit, displayName, shareWeight, friendCode); setShowOnboarding(false); Keyboard.dismiss(); }}>
              <Text style={styles.authPrimaryBtnText}>{t.continueBtn}</Text>
              <Ionicons name="arrow-forward" size={20} color="#FFF" style={{marginLeft: 8}}/>
            </TouchableOpacity>
          </View>
        </View>
      </DismissKeyboardView>
    );
  }

  return (    
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} enabled={Platform.OS !== 'web'}>
      <View style={styles.container}>
      
        {/* 🔥 RESTORED HEADER (Icons moved down to the toolbar) */}
        <View style={styles.headerContainer}>
          <View>
            <Text style={styles.headerTitle}>{t.appTitle || "Rep & Gains"}</Text>
            {appMode === 'cloud_app' && (
              <View style={{flexDirection: 'row', alignItems: 'center', marginTop: 4}}>
                <Ionicons name="cloud-done" size={12} color="#10B981" />
                <Text style={{fontSize: 12, color: '#10B981', marginLeft: 4, fontWeight: '600'}}>Synced to Cloud</Text>
              </View>
            )}
          </View>
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
            
            {/* 🔥 NEW UNIFIED TOOLBAR 🔥 */}
            <View style={{flexDirection: 'row', gap: 8, alignItems: 'center'}}>
              {!isFormVisible && (
                <>
                  <TouchableOpacity style={styles.calendarOverviewBtn} onPress={() => setIsSocialVisible(true)}>
                    <Ionicons name="people" size={20} color="#4361EE" />
                  </TouchableOpacity>
                  
                  <TouchableOpacity style={styles.calendarOverviewBtn} onPress={() => setIsChartVisible(true)}>
                    <Ionicons name="stats-chart" size={20} color="#4361EE" />
                  </TouchableOpacity>

                  <TouchableOpacity style={[styles.calendarOverviewBtn, filterDate && {backgroundColor: '#4361EE'}]} onPress={() => setIsCalendarOverviewVisible(true)}>
                    <Ionicons name="calendar" size={20} color={filterDate ? "#FFF" : "#4361EE"} />
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.calendarOverviewBtn} onPress={() => setIsSettingsVisible(true)}>
                    <Ionicons name="settings" size={20} color="#4361EE" />
                  </TouchableOpacity>

                  {/* Add Button - Removed text, made it a sleek square icon */}
                  <TouchableOpacity style={[styles.addButton, { paddingHorizontal: 12, paddingVertical: 10 }]} onPress={() => setIsFormVisible(true)}>
                    <Ionicons name="add" size={22} color="#FFF" />
                  </TouchableOpacity>
                </>
              )}
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
              <WorkoutCard item={item} userWeightUnit={userWeightUnit} onEdit={handleEdit} onDelete={handleDelete} />
            )}
            ListEmptyComponent={<Text style={styles.emptyText}>No workouts found for this date.</Text>}
          />
        </View>

        {/* ========================================== */}
        {/* 🏋️ EXERCISE SELECTION MODAL                */}
        {/* ========================================== */}
        {isDropdownVisible && (
        <Modal visible={isDropdownVisible} transparent={true} animationType="fade">
          <View style={styles.modalBackground}>
            <View style={[styles.modalContent, { height: '85%' }]}>
              
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{t.chooseExercise}</Text>
                <TouchableOpacity onPress={() => setIsDropdownVisible(false)}>
                  <Ionicons name="close-circle" size={28} color="#8D99AE" />
                </TouchableOpacity>
              </View>

              {/* 🔥 THE NEW BUTTON THAT OPENS THE BUILDER */}
              <TouchableOpacity 
                style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0F4FF', padding: 16, borderRadius: 16, marginBottom: 16, borderWidth: 1, borderColor: '#DCE4FF', justifyContent: 'center' }}
                onPress={() => {
                  setIsDropdownVisible(false); // 1. Close the dropdown first
                  setTimeout(() => {
                    setIsAddCustomVisible(true); // 2. Open the builder after a tiny delay
                  }, 150); // 150ms gives the phone enough time to clear the screen
                }}
              >
                <Ionicons name="add-circle" size={24} color="#4361EE" style={{marginRight: 8}} />
                <Text style={{color: '#4361EE', fontWeight: '700', fontSize: 16}}>
                  {t.createNewExercise || "Create New Exercise"}
                </Text>
              </TouchableOpacity>

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

        {/* ========================================== */}
        {/* 🛠️ CREATE CUSTOM EXERCISE MODAL             */}
        {/* ========================================== */}
        {isAddCustomVisible && (
        <Modal visible={isAddCustomVisible} transparent={true} animationType="slide">
          {/* 🔥 NEW: Added KeyboardAvoidingView INSIDE the modal */}
          <KeyboardAvoidingView 
            style={{ flex: 1 }} 
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <View style={styles.modalBackground}>
              <View style={styles.modalContent}>
                
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>{t.createNewExercise || "Create New Exercise"}</Text>
                  <TouchableOpacity onPress={() => setIsAddCustomVisible(false)}>
                    <Ionicons name="close-circle" size={28} color="#8D99AE" />
                  </TouchableOpacity>
                </View>

                <View style={[styles.customExerciseCard, { marginBottom: 0, borderWidth: 0, backgroundColor: 'transparent', padding: 0 }]}>
                  <TextInput 
                    style={styles.customExerciseInput} 
                    placeholder={t.typeNew || "Type new exercise..."} 
                    placeholderTextColor="#A0AABF" 
                    value={newCustomExercise} 
                    onChangeText={setNewCustomExercise} 
                    autoFocus={true} 
                  />
                  
                  <Text style={{fontSize: 12, fontWeight: '800', color: '#8D99AE', marginTop: 16, marginBottom: 8, letterSpacing: 1}}>
                    {t.intensity || "INTENSITY"}
                  </Text>
                  
                  <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12}}>
                    {[
                      { label: t.intensityVeryLight || 'Very Light', val: 2.5 },
                      { label: t.intensityLight || 'Light', val: 4.0 },
                      { label: t.intensityModerate || 'Moderate', val: 5.0 },
                      { label: t.intensityHard || 'Hard', val: 8.0 },
                      { label: t.intensityMax || 'Max Effort', val: 12.0 }
                    ].map((tier) => (
                      <TouchableOpacity 
                        key={tier.val}
                        style={[styles.intensityBtn, newExerciseIntensity === tier.val && styles.intensityBtnActive]} 
                        onPress={() => setNewExerciseIntensity(tier.val)}
                      >
                        <Text style={[styles.intensityBtnText, newExerciseIntensity === tier.val && styles.intensityBtnTextActive]}>
                          {tier.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <View style={{backgroundColor: '#F1F5F9', padding: 12, borderRadius: 10, marginBottom: 16, borderWidth: 1, borderColor: '#E2E8F0'}}>
                    <Text style={{fontSize: 13, color: '#475569', fontStyle: 'italic', lineHeight: 20}}>
                      {newExerciseIntensity === 2.5 && (t.ctxVeryLight || 'Like slow walking or stretching.')}
                      {newExerciseIntensity === 4.0 && (t.ctxLight || 'Like a warmup or casual bike ride.')}
                      {newExerciseIntensity === 5.0 && (t.ctxModerate || 'Like standard weightlifting or a brisk walk.')}
                      {newExerciseIntensity === 8.0 && (t.ctxHard || 'Like heavy compound lifting or jogging.')}
                      {newExerciseIntensity === 12.0 && (t.ctxMax || 'Like sprinting, bouldering, or HIIT.')}
                    </Text>
                  </View>

                  <TouchableOpacity style={styles.customExerciseBtn} onPress={handleAddCustomExercise}>
                    <Text style={{color: '#FFF', fontWeight: '700'}}>{t.save || "Save"}</Text>
                    <Ionicons name="checkmark-circle" size={20} color="#FFF" style={{marginLeft: 4}}/>
                  </TouchableOpacity>
                </View>

              </View>
            </View>
          </KeyboardAvoidingView>
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

        {/* 🔥 NEW: CHART MODAL 🔥 */}
        {isChartVisible && (
          <Modal visible={isChartVisible} transparent={true} animationType="fade">
            <View style={styles.modalBackground}>
              <View style={styles.modalContent}>
                
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>{t.statsOverview || "Stats & Progress"}</Text>
                  <TouchableOpacity onPress={() => setIsChartVisible(false)}><Ionicons name="close-circle" size={28} color="#8D99AE" /></TouchableOpacity>
                </View>

                {/* Range Toggle */}
                <View style={styles.chartToggleContainer}>
                  <TouchableOpacity style={[styles.chartToggleBtn, chartDays === 7 && styles.chartToggleBtnActive]} onPress={() => setChartDays(7)}>
                    <Text style={[styles.chartToggleText, chartDays === 7 && styles.chartToggleTextActive]}>{t.last7Days || "7 Days"}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.chartToggleBtn, chartDays === 30 && styles.chartToggleBtnActive]} onPress={() => setChartDays(30)}>
                    <Text style={[styles.chartToggleText, chartDays === 30 && styles.chartToggleTextActive]}>{t.last30Days || "30 Days"}</Text>
                  </TouchableOpacity>
                </View>

                {/* The Chart */}
                <View style={{alignItems: 'center'}}>
                  <BarChart
                    data={getChartData()}
                    width={screenWidth - 48} // Padding minus margins
                    height={220}
                    yAxisLabel=""
                    yAxisSuffix=" c" // Keep it short to fit the screen
                    chartConfig={{
                      backgroundColor: "#ffffff",
                      backgroundGradientFrom: "#ffffff",
                      backgroundGradientTo: "#ffffff",
                      decimalPlaces: 0, 
                      color: (opacity = 1) => `rgba(67, 97, 238, ${opacity})`,
                      labelColor: (opacity = 1) => `rgba(141, 153, 174, ${opacity})`,
                      style: { borderRadius: 16 },
                      barPercentage: chartDays === 30 ? 0.3 : 0.6, // Make bars thinner if showing 30 days
                    }}
                    style={{ borderRadius: 16 }}
                    showValuesOnTopOfBars={chartDays === 7} // Only show floating numbers on 7-day view
                    fromZero={true}
                  />
                </View>

              </View>
            </View>
          </Modal>
        )}
        
        {/* ⚙️ SETTINGS MODAL */}
        {isSettingsVisible && (
          <Modal visible={isSettingsVisible} transparent={true} animationType="fade">
            <TouchableWithoutFeedback onPress={() => setIsSettingsVisible(false)}>
              <View style={styles.modalBackground}>
                <TouchableWithoutFeedback>
                  {/* 🔥 FIXED: Added maxHeight so it never gets pushed off the screen */}
                  <View style={[styles.modalContent, { maxHeight: '90%' }]}>
                    
                    <View style={styles.modalHeader}>
                      <Text style={styles.modalTitle}>{t.settings}</Text>
                      <TouchableOpacity onPress={() => setIsSettingsVisible(false)}><Ionicons name="close-circle" size={28} color="#8D99AE" /></TouchableOpacity>
                    </View>

                    {/* 🔥 FIXED: Added ScrollView so tall menus can be scrolled */}
                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
                      <TouchableOpacity style={styles.settingsRow} onPress={toggleLanguage}>
                        <View style={{flexDirection: 'row', alignItems: 'center'}}><Ionicons name="language-outline" size={24} color="#4361EE" style={{marginRight: 12}} /><Text style={styles.settingsRowText}>{t.language}</Text></View>
                        <Text style={styles.settingsRowValue}>{lang === 'en' ? '🇬🇧 English' : '🇳🇱 Nederlands'}</Text>
                      </TouchableOpacity>

                      <View style={styles.profileSection}>
                        <Text style={styles.dangerZoneTitle}>{t.myProfile}</Text>
                        
                        {appMode === 'cloud_app' && (
                          <>
                            <Text style={[styles.inputLabel, {marginTop: 10}]}>{t.displayName}</Text>
                            <TextInput style={styles.input} value={displayName} onChangeText={setDisplayName} maxLength={15} />
                            
                            <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, backgroundColor: '#F8FAFC', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0'}}>
                              <View>
                                <Text style={{fontSize: 14, fontWeight: '700', color: '#1E293B'}}>{t.friendCode}</Text>
                                <Text style={{fontSize: 12, color: '#8D99AE', marginTop: 2}}>Share this to add friends</Text>
                              </View>
                              <Text style={{fontSize: 18, fontWeight: '900', color: '#4361EE', letterSpacing: 2}}>{friendCode || '------'}</Text>
                            </View>
                          </>
                        )}

                        <Text style={styles.inputLabel}>{t.bodyweight}</Text>
                        <View style={{flexDirection: 'row', gap: 10, alignItems: 'center'}}>
                          <TextInput style={[styles.input, {flex: 1, marginBottom: 0}]} keyboardType="numeric" value={userWeight} onChangeText={setUserWeight} />
                          <View style={styles.unitToggleContainerCompact}>
                            <TouchableOpacity style={[styles.unitOptionCompact, userWeightUnit === 'kg' && styles.unitOptionActive]} onPress={() => setUserWeightUnit('kg')}><Text style={[styles.unitOptionText, userWeightUnit === 'kg' && styles.unitOptionTextActive]}>kg</Text></TouchableOpacity>
                            <TouchableOpacity style={[styles.unitOptionCompact, userWeightUnit === 'lbs' && styles.unitOptionActive]} onPress={() => setUserWeightUnit('lbs')}><Text style={[styles.unitOptionText, userWeightUnit === 'lbs' && styles.unitOptionTextActive]}>lbs</Text></TouchableOpacity>
                          </View>
                        </View>

                        {appMode === 'cloud_app' && (
                          <TouchableOpacity style={{flexDirection: 'row', alignItems: 'center', marginTop: 20}} onPress={() => setShareWeight(!shareWeight)}>
                            <Ionicons name={shareWeight ? "checkbox" : "square-outline"} size={24} color={shareWeight ? "#4361EE" : "#A0AABF"} style={{marginRight: 10}} />
                            <Text style={{fontSize: 15, color: '#1E293B', fontWeight: '500'}}>{t.shareWeight}</Text>
                          </TouchableOpacity>
                        )}

                        <TouchableOpacity style={{backgroundColor: '#1E293B', padding: 16, borderRadius: 12, marginTop: 20, alignItems: 'center'}} onPress={() => { saveProfileData(userWeight, userWeightUnit, displayName, shareWeight, friendCode); setIsSettingsVisible(false); Keyboard.dismiss(); }}>
                          <Text style={{color: '#FFF', fontWeight: '700'}}>{t.updateProfile || "Save Profile"}</Text>
                        </TouchableOpacity>
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
                        <>
                          {/* 🔥 NEW: Offline Sync Button 🔥 */}
                          <View style={styles.dangerZone}>
                            <Text style={styles.dangerZoneTitle}>CLOUD SYNC</Text>
                            <TouchableOpacity 
                              style={[styles.authPrimaryBtn, {marginBottom: 10}]} 
                              onPress={() => { setIsSettingsVisible(false); setAppMode('login_form'); }}
                            >
                              <Ionicons name="cloud-upload-outline" size={20} color="#FFF" style={{marginRight: 8}} />
                              <Text style={styles.authPrimaryBtnText}>{t.loginToSync || "Login & Sync Data"}</Text>
                            </TouchableOpacity>
                          </View>

                          <TouchableOpacity style={styles.settingsRow} onPress={() => { setIsSettingsVisible(false); setAppMode('gatekeeper'); setWorkouts([]); setExerciseList(DEFAULT_EXERCISES); }}>
                            <View style={{flexDirection: 'row', alignItems: 'center'}}><Ionicons name="log-out-outline" size={24} color="#64748B" style={{marginRight: 12}} /><Text style={styles.settingsRowText}>{t.exitOffline || "Sign Out"}</Text></View>
                          </TouchableOpacity>
                        </>
                      )}
                    </ScrollView>

                  </View>
                </TouchableWithoutFeedback>
              </View>
            </TouchableWithoutFeedback>
          </Modal>
        )}
        {/* 🔥 THE NEW SOCIAL MODAL 🔥 */}
        <SocialModal 
          isVisible={isSocialVisible} 
          onClose={() => setIsSocialVisible(false)} 
          t={t} 
          friendCode={friendCode}
          myWorkouts={workouts}             
          myDisplayName={displayName}       
          appMode={appMode} // 🔥 NEW
        />
      </View>
    </KeyboardAvoidingView>
    
  );
}