import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Keyboard, KeyboardAvoidingView, Modal, Platform, StyleSheet, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import { Calendar } from 'react-native-calendars';
// Add these to your imports at the top
import { createUserWithEmailAndPassword, deleteUser, sendPasswordResetEmail, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { deleteDoc, doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../../firebaseConfig'; // <-- adjust path if necessary


// --- DICTIONARY ---
const TRANSLATIONS = {
  en: {
    appTitle: "Gains Tracker", exercise: "EXERCISE", date: "DATE", selectPrompt: "Select an exercise...", sets: "SETS", reps: "REPS", trackBy: "TRACK BY", weightOption: "Weight (lbs/kg)", timeOption: "Time (sec)", weightInput: "WEIGHT", timeInput: "DURATION", cancel: "Cancel", save: "Save", update: "Update", history: "History", logWorkout: "Log Workout", chooseExercise: "Choose Exercise", typeNew: "Or type a new one...", deleteConfirmTitle: "Delete Workout", deleteConfirmMsg: "Are you sure you want to remove this?", deleteExerciseMsg: "Delete this exercise from your list?", calendarOverview: "Calendar Overview", close: "Close", filteredTo: "Filtered to:",
    // AUTH WORDS
    welcome: "Welcome to", cloudSync: "Cloud Sync Enabled", login: "Login / Register", continueOffline: "Continue Offline", email: "Email", password: "Password", submitLogin: "Sign In", back: "Back",
    forgotPassword: "Forgot Password?", resetSentTitle: "Email Sent", resetSentMsg: "Check your email for a password reset link.", resetPrompt: "Please enter your email address first.", errorTitle: "Error", defaultError: "An unexpected error occurred. Please try again.",
    // STATS & SETTINGS
    totalCalories: "CALORIES", totalSets: "TOTAL SETS", settings: "Settings", language: "Language", logout: "Log Out", exitOffline: "Exit Offline Mode", dangerZone: "DANGER ZONE", deleteAccountBtn: "Delete Account", deleteAccountConfirmTitle: "Delete Account", deleteAccountConfirmMsg: "This will permanently delete your account and all cloud data. Are you sure?",
    // FIREBASE ERRORS
    "auth/invalid-email": "The email address is badly formatted.", "auth/invalid-credential": "No user found or incorrect password.", "auth/user-not-found": "No user found with this email.", "auth/wrong-password": "Incorrect password.", "auth/email-already-in-use": "This email is already registered.", "auth/weak-password": "Password should be at least 6 characters.", "auth/requires-recent-login": "For security, please log out and log back in before deleting your account."
  },
  nl: {
    appTitle: "Trainings Tracker", exercise: "OEFENING", date: "DATUM", selectPrompt: "Kies een oefening...", sets: "SETS", reps: "HERHALINGEN", trackBy: "BIJHOUDEN IN", weightOption: "Gewicht (kg)", timeOption: "Tijd (sec)", weightInput: "GEWICHT", timeInput: "DUUR", cancel: "Annuleren", save: "Opslaan", update: "Aanpassen", history: "Geschiedenis", logWorkout: "Training Loggen", chooseExercise: "Kies Oefening", typeNew: "Of typ een nieuwe...", deleteConfirmTitle: "Verwijder Training", deleteConfirmMsg: "Weet je zeker dat je dit wilt verwijderen?", deleteExerciseMsg: "Verwijder deze oefening uit de lijst?", calendarOverview: "Kalender Overzicht", close: "Sluiten", filteredTo: "Gefilterd op:",
    // AUTH WORDS
    welcome: "Welkom bij", cloudSync: "Cloud Sync Geactiveerd", login: "Inloggen / Registreren", continueOffline: "Offline Doorgaan", email: "E-mailadres", password: "Wachtwoord", submitLogin: "Inloggen", back: "Terug",
    forgotPassword: "Wachtwoord Vergeten?", resetSentTitle: "E-mail Verzonden", resetSentMsg: "Controleer je e-mail voor een reset link.", resetPrompt: "Vul eerst je e-mailadres in.", errorTitle: "Fout", defaultError: "Er is een onverwachte fout opgetreden. Probeer het opnieuw.",
    // STATS & SETTINGS
    totalCalories: "CALORIEËN", totalSets: "TOTAAL SETS", settings: "Instellingen", language: "Taal", logout: "Uitloggen", exitOffline: "Offline Modus Verlaten", dangerZone: "GEVARENZONE", deleteAccountBtn: "Account Verwijderen", deleteAccountConfirmTitle: "Account Verwijderen", deleteAccountConfirmMsg: "Dit verwijdert je account en alle cloud data permanent. Weet je het zeker?",
    // FIREBASE ERRORS
    "auth/invalid-email": "Het e-mailadres is ongeldig.", "auth/invalid-credential": "Geen gebruiker gevonden of onjuist wachtwoord.", "auth/user-not-found": "Geen gebruiker gevonden met dit e-mailadres.", "auth/wrong-password": "Onjuist wachtwoord.", "auth/email-already-in-use": "Dit e-mailadres is al geregistreerd.", "auth/weak-password": "Wachtwoord moet minimaal 6 tekens lang zijn.", "auth/requires-recent-login": "Log voor de veiligheid uit en opnieuw in voordat je je account verwijdert."
  }
};

type Workout = { id: string; name: string; sets: string; reps: string; value: string; unit: 'lbs/kg' | 'sec'; date: string; calories: number; };
const DEFAULT_EXERCISES = ['Bench Press', 'Squat', 'Deadlift', 'Plank', 'Running (Time)', 'HIIT Session', 'Pull-ups', 'Push-ups', 'Bicep Curls'];
const getLocalToday = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

export default function App() {
  // 🔐 NEW: AUTHENTICATION STATES
  const [appMode, setAppMode] = useState<'gatekeeper' | 'login_form' | 'register_form' | 'offline_app' | 'cloud_app'>('gatekeeper');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false); // 🔥 NEW: Pull-to-refresh state

  const [lang, setLang] = useState<'en' | 'nl'>('en');
  const t = TRANSLATIONS[lang]; 

  const [exercise, setExercise] = useState('');
  const [sets, setSets] = useState('');
  const [reps, setReps] = useState('');
  const [measurementValue, setMeasurementValue] = useState(''); 
  const [measurementUnit, setMeasurementUnit] = useState<'lbs/kg' | 'sec'>('lbs/kg'); 
  const [workoutDate, setWorkoutDate] = useState(getLocalToday()); 

  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterDate, setFilterDate] = useState<string | null>(null);

  const [isDropdownVisible, setIsDropdownVisible] = useState(false);
  const [isDatePickerVisible, setIsDatePickerVisible] = useState(false); 
  const [isCalendarOverviewVisible, setIsCalendarOverviewVisible] = useState(false); 
  const [isSettingsVisible, setIsSettingsVisible] = useState(false); // 🔥 NEW STATE

  const [exerciseList, setExerciseList] = useState<string[]>(DEFAULT_EXERCISES);
  const [newCustomExercise, setNewCustomExercise] = useState('');

  useEffect(() => { loadData(); }, []);

  const loadData = async (targetMode?: string) => {
    try {
      const user = auth.currentUser;
      const modeToUse = targetMode || appMode;
      
      if (user && modeToUse === 'cloud_app') {
        // ☁️ Load from Firebase Firestore
        const docRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          setWorkouts(data.workouts || []);
          setExerciseList(data.exercises || DEFAULT_EXERCISES); 
          if (data.language && (data.language === 'en' || data.language === 'nl')) {
            setLang(data.language); // 🔥 NEW: Load user's saved language
          }
        } else {
          setWorkouts([]);
          setExerciseList(DEFAULT_EXERCISES);
        }
      } else {
        // 📱 Load from Local AsyncStorage
        const savedWorkouts = await AsyncStorage.getItem('@gym_workouts');
        if (savedWorkouts !== null) setWorkouts(JSON.parse(savedWorkouts));
        else setWorkouts([]);

        // 🔥 NEW: Fetch local exercises ONLY for offline
        const savedExercises = await AsyncStorage.getItem('@custom_exercises');
        if (savedExercises !== null) setExerciseList(JSON.parse(savedExercises));
        else setExerciseList(DEFAULT_EXERCISES);
      }

      const savedLang = await AsyncStorage.getItem('@app_language');
      if (savedLang === 'nl' || savedLang === 'en') setLang(savedLang);
    } catch (error) {
      console.error("Error loading data:", error);
    }
  };

  const saveWorkouts = async (updatedWorkoutsArray: Workout[]) => {
    try { 
      const user = auth.currentUser;
      
      if (user && appMode === 'cloud_app') {
        // ☁️ ONLINE MODE: Save ONLY to Firebase Firestore
        await setDoc(doc(db, 'users', user.uid), { workouts: updatedWorkoutsArray }, { merge: true });
      } else {
        // 📱 OFFLINE MODE: Save ONLY to Local AsyncStorage
        await AsyncStorage.setItem('@gym_workouts', JSON.stringify(updatedWorkoutsArray)); 
      }
    } catch (error) {
      console.error("Error saving data:", error);
    }
  };

  const saveExercises = async (updatedList: string[]) => {
    try {
      const user = auth.currentUser;
      if (user && appMode === 'cloud_app') {
        // ☁️ ONLINE MODE: Save ONLY to Firebase Firestore
        await setDoc(doc(db, 'users', user.uid), { exercises: updatedList }, { merge: true });
      } else {
        // 📱 OFFLINE MODE: Save ONLY to Local AsyncStorage
        await AsyncStorage.setItem('@custom_exercises', JSON.stringify(updatedList));
      }
    } catch (error) {
      console.error("Error saving exercises:", error);
    }
  };


  /// --- 🔐 REAL FIREBASE AUTHENTICATION LOGIC ---
  const handleLogin = async () => {
    if (email === '' || password === '') {
      Alert.alert('Error', 'Please enter an email and password.');
      return;
    }
    setIsLoading(true); // Start loading spinner
    try {
      await signInWithEmailAndPassword(auth, email, password);
      Keyboard.dismiss();
      setAppMode('cloud_app');
      loadData('cloud_app'); 
    } catch (error: any) {
      const errorMsg = t[error.code as keyof typeof t] || error.message;
      Alert.alert(t.errorTitle, errorMsg);
    } finally {
      setIsLoading(false); // Stop loading spinner no matter what happens
    }
  };

  const handleRegister = async () => {
    if (email === '' || password === '') {
      Alert.alert('Error', 'Please enter an email and password.');
      return;
    }
    setIsLoading(true); // Start loading spinner
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      Keyboard.dismiss();
      setAppMode('cloud_app');
      setWorkouts([]); 
      saveWorkouts([]); 
    } catch (error: any) {
      Alert.alert('Registration Error', error.message);
    } finally {
      setIsLoading(false); // Stop loading spinner
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setAppMode('gatekeeper');
      setEmail('');     
      setPassword(''); 
      setWorkouts([]); // 🔥 NEW: Clear the workouts from the screen!
      setExerciseList(DEFAULT_EXERCISES);
      // loadData();   // <-- REMOVE OR COMMENT OUT this line so it doesn't immediately load offline data
    } catch (error: any) {
      Alert.alert('Logout Error', error.message);
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(t.deleteAccountConfirmTitle, t.deleteAccountConfirmMsg, [
      { text: t.cancel, style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            const user = auth.currentUser;
            if (user) {
              setIsLoading(true);
              // 1. Delete their data from Firestore first
              await deleteDoc(doc(db, 'users', user.uid));
              // 2. Delete the actual Auth account
              await deleteUser(user);
              // 3. Clear local state and boot them to the welcome screen
              setAppMode('gatekeeper');
              setWorkouts([]);
              setExerciseList(DEFAULT_EXERCISES);
            }
          } catch (error: any) {
            const errorMsg = t[error.code as keyof typeof t] || error.message;
            Alert.alert(t.errorTitle, errorMsg);
          } finally {
            setIsLoading(false);
          }
        }
      }
    ]);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadData(); // Reloads Firebase or Local data based on appMode
    setIsRefreshing(false);
  };

  const handleContinueOffline = () => {
    setAppMode('offline_app');
    loadData('offline_app'); // Explicitly tell it to load offline data
  };

  const handleForgotPassword = async () => {
    if (email === '') {
      Alert.alert(t.errorTitle, t.resetPrompt);
      return;
    }
    setIsLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      Alert.alert(t.resetSentTitle, t.resetSentMsg);
    } catch (error: any) {
      const errorMsg = t[error.code as keyof typeof t] || error.message;
      Alert.alert(t.errorTitle, errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleLanguage = async () => {
    const newLang = lang === 'en' ? 'nl' : 'en';
    setLang(newLang);
    
    const user = auth.currentUser;
    if (user && appMode === 'cloud_app') {
      // ☁️ Save language to Firebase
      await setDoc(doc(db, 'users', user.uid), { language: newLang }, { merge: true });
    } else {
      // 📱 Save language locally
      await AsyncStorage.setItem('@app_language', newLang);
    }
  };;

  const calculateCalories = (unit: string, s: string, r: string, v: string) => {
    const setsCount = s ? Number(s) : 1; const repsCount = r ? Number(r) : 1; const valueCount = Number(v) || 0;
    if (unit === 'sec') { return Math.round((setsCount * repsCount * valueCount) * 0.15); } 
    else { return Math.round(setsCount * repsCount * (0.3 + (valueCount * 0.005))); }
  };

  const handleAddCustomExercise = async () => {
    const trimmedName = newCustomExercise.trim();
    if (trimmedName === '') return;
    if (exerciseList.includes(trimmedName)) return;
    
    const updatedList = [trimmedName, ...exerciseList];
    setExerciseList(updatedList); 
    setNewCustomExercise(''); 
    Keyboard.dismiss();
    
    // 🔥 NEW: Use our smart save function
    await saveExercises(updatedList);
  };

  const handleDeleteExerciseItem = (exerciseToRemove: string) => {
    Alert.alert(t.deleteConfirmTitle, t.deleteExerciseMsg, [
      { text: t.cancel, style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
          const updatedList = exerciseList.filter((e) => e !== exerciseToRemove);
          setExerciseList(updatedList); 
          
          // 🔥 NEW: Use our smart save function
          await saveExercises(updatedList);
        }
      }
    ]);
  };

  const handleSave = () => {
    if (exercise.trim() === '') return; 
    const burnedCalories = calculateCalories(measurementUnit, sets, reps, measurementValue);
    let updatedWorkouts;
    if (editingId) {
      updatedWorkouts = workouts.map((w) => w.id === editingId ? { ...w, name: exercise, sets: sets || '0', reps: reps || '0', value: measurementValue || '0', unit: measurementUnit, calories: burnedCalories, date: workoutDate } : w);
    } else {
      updatedWorkouts = [{ id: Date.now().toString(), name: exercise, sets: sets || '0', reps: reps || '0', value: measurementValue || '0', unit: measurementUnit, date: workoutDate, calories: burnedCalories }, ...workouts];
    }
    setWorkouts(updatedWorkouts); saveWorkouts(updatedWorkouts); resetFormState();
  };

  const resetFormState = () => { setExercise(''); setSets(''); setReps(''); setMeasurementValue(''); setMeasurementUnit('lbs/kg'); setEditingId(null); setIsFormVisible(false); setWorkoutDate(getLocalToday()); Keyboard.dismiss(); };
  const handleEdit = (workout: Workout) => { setExercise(workout.name); setSets(workout.sets); setReps(workout.reps); setMeasurementValue(workout.value); setMeasurementUnit(workout.unit); setWorkoutDate(workout.date || getLocalToday()); setEditingId(workout.id); setIsFormVisible(true); };
  
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
  
  // 🔥 NEW: Calculate Stats for the currently displayed workouts
  const dailyCalories = displayedWorkouts.reduce((sum, w) => sum + (w.calories || 0), 0);
  const dailySets = displayedWorkouts.reduce((sum, w) => sum + (Number(w.sets) || 0), 0);

  // ==========================================
  // 🚪 RENDER: GATEKEEPER / WELCOME SCREEN
  // ==========================================
  if (appMode === 'gatekeeper') {
    return (
      <View style={styles.authContainer}>
        <View style={styles.authLogoBox}>
          <Ionicons name="barbell" size={80} color="#4361EE" />
          <Text style={styles.authWelcomeText}>{t.welcome}</Text>
          <Text style={styles.authTitleText}>{t.appTitle}</Text>
        </View>

        <View style={styles.authActionBox}>
          <TouchableOpacity style={styles.authPrimaryBtn} onPress={() => setAppMode('login_form')}>
            <Ionicons name="log-in-outline" size={20} color="#FFF" style={{marginRight: 8}}/>
            <Text style={styles.authPrimaryBtnText}>Login</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.authPrimaryBtn, {backgroundColor: '#10B981', shadowColor: '#10B981'}]} onPress={() => setAppMode('register_form')}>
            <Ionicons name="person-add-outline" size={20} color="#FFF" style={{marginRight: 8}}/>
            <Text style={styles.authPrimaryBtnText}>Register</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.authSecondaryBtn} onPress={handleContinueOffline}>
            <Ionicons name="phone-portrait-outline" size={20} color="#64748B" style={{marginRight: 8}}/>
            <Text style={styles.authSecondaryBtnText}>{t.continueOffline}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

// ==========================================
  // 🔐 RENDER: LOGIN FORM SCREEN
  // ==========================================
  if (appMode === 'login_form') {
    return (
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.authContainer}>
          <TouchableOpacity style={styles.authBackBtn} onPress={() => setAppMode('gatekeeper')}>
            <Ionicons name="arrow-back" size={24} color="#1E293B" />
          </TouchableOpacity>

          <View style={styles.authLogoBox}>
            <Text style={styles.authTitleText}>Welcome Back</Text>
            <Text style={{color: '#8D99AE', marginTop: 10, textAlign: 'center'}}>Sign in to sync your workouts.</Text>
          </View>

          <View style={styles.authFormBox}>
            <TextInput style={styles.authInput} placeholder={t.email} placeholderTextColor="#A0AABF" keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} />
            <TextInput style={styles.authInput} placeholder={t.password} placeholderTextColor="#A0AABF" secureTextEntry value={password} onChangeText={setPassword} />
            
            {/* 🔥 UPDATED LOGIN BUTTON 🔥 */}
            <TouchableOpacity 
              style={[styles.authPrimaryBtn, isLoading && { opacity: 0.7 }]} 
              onPress={handleLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.authPrimaryBtnText}>{t.submitLogin}</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity 
              style={{marginTop: 15, alignItems: 'center'}} 
              onPress={handleForgotPassword}
              disabled={isLoading}
            >
              <Text style={{color: '#4361EE', fontWeight: '600', fontSize: 14}}>{t.forgotPassword}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableWithoutFeedback>
    );
  }

// ==========================================
  // 📝 RENDER: REGISTER FORM SCREEN
  // ==========================================
  if (appMode === 'register_form') {
    return (
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.authContainer}>
          <TouchableOpacity style={styles.authBackBtn} onPress={() => setAppMode('gatekeeper')}>
            <Ionicons name="arrow-back" size={24} color="#1E293B" />
          </TouchableOpacity>

          <View style={styles.authLogoBox}>
            <Text style={styles.authTitleText}>Create Account</Text>
            <Text style={{color: '#8D99AE', marginTop: 10, textAlign: 'center'}}>Join to save your gains to the cloud.</Text>
          </View>

          <View style={styles.authFormBox}>
            <TextInput style={styles.authInput} placeholder={t.email} placeholderTextColor="#A0AABF" keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} />
            <TextInput style={styles.authInput} placeholder={t.password} placeholderTextColor="#A0AABF" secureTextEntry value={password} onChangeText={setPassword} />
            
            {/* 🔥 UPDATED REGISTER BUTTON 🔥 */}
            <TouchableOpacity 
              style={[styles.authPrimaryBtn, {backgroundColor: '#10B981', shadowColor: '#10B981'}, isLoading && { opacity: 0.7 }]} 
              onPress={handleRegister}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.authPrimaryBtnText}>Create Account</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </TouchableWithoutFeedback>
    );
  }
  // ==========================================
  // 📱 RENDER: THE MAIN APP (Offline or Cloud)
  // ==========================================
  return (    
    <KeyboardAvoidingView 
      style={{ flex: 1 }} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.container}>
      
        <View style={styles.headerContainer}>
          <View>
            <Text style={styles.headerTitle}>{t.appTitle}</Text>
            {appMode === 'cloud_app' && (
              <View style={{flexDirection: 'row', alignItems: 'center', marginTop: 4}}>
                <Ionicons name="cloud-done" size={12} color="#10B981" />
                <Text style={{fontSize: 12, color: '#10B981', marginLeft: 4, fontWeight: '600'}}>Synced to Cloud</Text>
              </View>
            )}
          </View>

          {/* 🔥 SINGLE SETTINGS BUTTON 🔥 */}
          <TouchableOpacity onPress={() => setIsSettingsVisible(true)} style={{padding: 4}}>
            <Ionicons name="settings-outline" size={28} color="#1E293B" />
          </TouchableOpacity>
        </View>

        {isFormVisible && (
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.inputCard}>
              
              <View style={styles.dateSelectorRow}>
                <View style={{flex: 1}}>
                  <Text style={styles.inputLabel}>{t.date}</Text>
                  <TouchableOpacity style={styles.dateSelectorBtn} onPress={() => setIsDatePickerVisible(true)}>
                    <Ionicons name="calendar-outline" size={18} color="#4361EE" style={{marginRight: 8}}/>
                    <Text style={styles.dateSelectorText}>{workoutDate}</Text>
                  </TouchableOpacity>
                </View>
                <View style={{flex: 1, marginLeft: 10}}>
                  <Text style={styles.inputLabel}>{t.exercise}</Text>
                  <TouchableOpacity style={styles.dropdownSelector} onPress={() => setIsDropdownVisible(true)}>
                    <Text style={exercise ? styles.dropdownTextActive : styles.dropdownTextPlaceholder} numberOfLines={1}>
                      {exercise ? exercise : t.selectPrompt}
                    </Text>
                    <Ionicons name="chevron-down" size={16} color="#8D99AE" />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.row}>
                <View style={styles.halfInputContainer}>
                  <Text style={styles.inputLabel}>{t.sets}</Text>
                  <TextInput style={styles.input} placeholder="3" placeholderTextColor="#A0AABF" keyboardType="numeric" value={sets} onChangeText={setSets} />
                </View>
                <View style={styles.halfInputContainer}>
                  <Text style={styles.inputLabel}>{t.reps}</Text>
                  <TextInput style={styles.input} placeholder="10" placeholderTextColor="#A0AABF" keyboardType="numeric" value={reps} onChangeText={setReps} />
                </View>
              </View>
              
              <Text style={styles.inputLabel}>{t.trackBy}</Text>
              <View style={styles.unitToggleContainer}>
                <TouchableOpacity style={[styles.unitOption, measurementUnit === 'lbs/kg' && styles.unitOptionActive]} onPress={() => setMeasurementUnit('lbs/kg')}>
                  <Ionicons name="barbell-outline" size={16} color={measurementUnit === 'lbs/kg' ? '#FFF' : '#64748B'} style={{marginRight: 6}} />
                  <Text style={[styles.unitOptionText, measurementUnit === 'lbs/kg' && styles.unitOptionTextActive]}>{t.weightOption}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.unitOption, measurementUnit === 'sec' && styles.unitOptionActive]} onPress={() => setMeasurementUnit('sec')}>
                  <Ionicons name="timer-outline" size={16} color={measurementUnit === 'sec' ? '#FFF' : '#64748B'} style={{marginRight: 6}} />
                  <Text style={[styles.unitOptionText, measurementUnit === 'sec' && styles.unitOptionTextActive]}>{t.timeOption}</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.inputLabel}>{measurementUnit === 'lbs/kg' ? t.weightInput : t.timeInput}</Text>
              <View style={styles.measurementInputContainer}>
                <TextInput style={styles.measurementInput} placeholder="0" placeholderTextColor="#A0AABF" keyboardType="numeric" value={measurementValue} onChangeText={setMeasurementValue} />
                <Text style={styles.measurementUnitSuffix}>{measurementUnit === 'lbs/kg' ? 'lbs/kg' : 'sec'}</Text>
              </View>

              <View style={styles.formActionRow}>
                <TouchableOpacity style={styles.cancelButton} onPress={resetFormState}>
                  <Text style={styles.cancelButtonText}>{t.cancel}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                  <Ionicons name={editingId ? "checkmark-circle" : "add-circle"} size={20} color="#FFF" style={{marginRight: 6}} />
                  <Text style={styles.saveButtonText}>{editingId ? t.update : t.save}</Text>
                </TouchableOpacity>
              </View>

            </View>
          </TouchableWithoutFeedback>
        )}

        <View style={styles.listContainer}>
          <View style={styles.listHeaderRow}>
            <Text style={styles.sectionTitle}>{t.history}</Text>
            <View style={{flexDirection: 'row', gap: 10}}>
              {!isFormVisible && (
                <TouchableOpacity style={[styles.calendarOverviewBtn, filterDate && {backgroundColor: '#4361EE'}]} onPress={() => setIsCalendarOverviewVisible(true)}>
                  <Ionicons name="calendar" size={20} color={filterDate ? "#FFF" : "#4361EE"} />
                </TouchableOpacity>
              )}
              {!isFormVisible && (
                <TouchableOpacity style={styles.addButton} onPress={() => setIsFormVisible(true)}>
                  <Ionicons name="add" size={20} color="#FFF" />
                  <Text style={styles.addButtonText}>{t.logWorkout}</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {filterDate && (
            <View style={styles.filterBadgeContainer}>
              <Text style={styles.filterBadgeText}>{t.filteredTo} {filterDate}</Text>
              <TouchableOpacity onPress={() => setFilterDate(null)}>
                <Ionicons name="close-circle" size={22} color="#EF233C" />
              </TouchableOpacity>
            </View>
          )}

          {/* 🔥 NEW: Daily Stats Bar */}
          {displayedWorkouts.length > 0 && (
            <View style={styles.statsContainer}>
              <View style={styles.statBox}>
                <Text style={styles.statBoxLabel}>{t.totalSets}</Text>
                <Text style={styles.statBoxValue}>{dailySets}</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statBoxLabel}>{t.totalCalories}</Text>
                <Text style={styles.statBoxValue}>🔥 {dailyCalories}</Text>
              </View>
            </View>
          )}
          
          <FlatList
              data={displayedWorkouts} 
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag" 
              refreshing={isRefreshing}     
              onRefresh={handleRefresh}     
              renderItem={({ item }) => (
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
                        @ <Text style={styles.statHighlightBold}>{item.value}</Text> {item.unit === 'lbs/kg' ? 'lbs/kg' : 'sec'}
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
                  <TouchableOpacity style={styles.editActionBtn} onPress={() => handleEdit(item)}>
                    <Ionicons name="pencil" size={18} color="#FFF" />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.deleteActionBtn} onPress={() => handleDelete(item.id)}>
                    <Ionicons name="trash" size={18} color="#FFF" />
                  </TouchableOpacity>
                </View>
              </View>
            )}
            ListEmptyComponent={<Text style={styles.emptyText}>No workouts found for this date.</Text>}
          />
        </View>

        <Modal visible={isDropdownVisible} transparent={true} animationType="fade">
          <View style={styles.modalBackground}>
            <View style={[styles.modalContent, { height: '85%' }]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{t.chooseExercise}</Text>
                <TouchableOpacity onPress={() => setIsDropdownVisible(false)}><Ionicons name="close-circle" size={28} color="#8D99AE" /></TouchableOpacity>
              </View>
              <View style={styles.customExerciseRow}>
                <TextInput style={styles.customExerciseInput} placeholder={t.typeNew} placeholderTextColor="#A0AABF" value={newCustomExercise} onChangeText={setNewCustomExercise} />
                <TouchableOpacity style={styles.customExerciseBtn} onPress={handleAddCustomExercise}><Ionicons name="add" size={24} color="#FFF" /></TouchableOpacity>
              </View>
              <FlatList
                data={exerciseList} style={{ flex: 1 }} keyExtractor={(item) => item} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={true}
                renderItem={({ item }) => (
                  <View style={styles.modalItemContainer}>
                    <TouchableOpacity style={styles.modalItemTextContainer} onPress={() => { setExercise(item); setIsDropdownVisible(false); }}><Text style={styles.modalItemText}>{item}</Text></TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDeleteExerciseItem(item)} style={{padding: 10}}><Ionicons name="trash-outline" size={20} color="#EF233C" /></TouchableOpacity>
                  </View>
                )}
              />
            </View>
          </View>
        </Modal>

        <Modal visible={isDatePickerVisible} transparent={true} animationType="fade">
          <View style={styles.modalBackground}>
            <View style={[styles.modalContent, {padding: 10}]}>
              <Calendar
                current={workoutDate} markingType={'custom'}
                markedDates={{ [workoutDate]: { customStyles: { container: { backgroundColor: '#4361EE', borderRadius: 12 }, text: { color: '#FFFFFF', fontWeight: 'bold' } } } }}
                onDayPress={(day: any) => { setWorkoutDate(day.dateString); setIsDatePickerVisible(false); }} theme={{ todayTextColor: '#4361EE', arrowColor: '#4361EE' }}
              />
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

        {/* ========================================== */}
        {/* ⚙️ SETTINGS MODAL */}
        {/* ========================================== */}
        <Modal visible={isSettingsVisible} transparent={true} animationType="fade">
          {/* 🔥 NEW: Wrapper to detect taps on the dark background */}
          <TouchableWithoutFeedback onPress={() => setIsSettingsVisible(false)}>
            <View style={styles.modalBackground}>
              
              {/* 🔥 NEW: Wrapper to prevent taps INSIDE the menu from closing it */}
              <TouchableWithoutFeedback>
                <View style={styles.modalContent}>
                  
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>{t.settings}</Text>
                    <TouchableOpacity onPress={() => setIsSettingsVisible(false)}>
                      <Ionicons name="close-circle" size={28} color="#8D99AE" />
                    </TouchableOpacity>
                  </View>

                  {/* Language Toggle (Available to everyone) */}
                  <TouchableOpacity style={styles.settingsRow} onPress={toggleLanguage}>
                    <View style={{flexDirection: 'row', alignItems: 'center'}}>
                      <Ionicons name="language-outline" size={24} color="#4361EE" style={{marginRight: 12}} />
                      <Text style={styles.settingsRowText}>{t.language}</Text>
                    </View>
                    <Text style={styles.settingsRowValue}>{lang === 'en' ? '🇬🇧 English' : '🇳🇱 Nederlands'}</Text>
                  </TouchableOpacity>

                  {/* App Mode Specific Buttons */}
                  {appMode === 'cloud_app' ? (
                    <>
                      <TouchableOpacity style={styles.settingsRow} onPress={() => { setIsSettingsVisible(false); handleLogout(); }}>
                        <View style={{flexDirection: 'row', alignItems: 'center'}}>
                          <Ionicons name="log-out-outline" size={24} color="#64748B" style={{marginRight: 12}} />
                          <Text style={styles.settingsRowText}>{t.logout}</Text>
                        </View>
                      </TouchableOpacity>

                      {/* 🔥 DANGER ZONE 🔥 */}
                      <View style={styles.dangerZone}>
                        <Text style={styles.dangerZoneTitle}>{t.dangerZone}</Text>
                        <TouchableOpacity style={styles.deleteAccountBtn} onPress={() => { setIsSettingsVisible(false); handleDeleteAccount(); }}>
                          <Ionicons name="trash-outline" size={20} color="#FFF" style={{marginRight: 8}} />
                          <Text style={styles.deleteAccountBtnText}>{t.deleteAccountBtn}</Text>
                        </TouchableOpacity>
                      </View>
                    </>
                  ) : (
                    <TouchableOpacity style={styles.settingsRow} onPress={() => { 
                      setIsSettingsVisible(false); 
                      setAppMode('gatekeeper'); 
                      setWorkouts([]); 
                      setExerciseList(DEFAULT_EXERCISES); 
                    }}>
                      <View style={{flexDirection: 'row', alignItems: 'center'}}>
                        <Ionicons name="log-in-outline" size={24} color="#4361EE" style={{marginRight: 12}} />
                        <Text style={styles.settingsRowText}>{t.exitOffline}</Text>
                      </View>
                    </TouchableOpacity>
                  )}

                </View>
              </TouchableWithoutFeedback>

            </View>
          </TouchableWithoutFeedback>
        </Modal>

      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  // AUTH STYLES
  authContainer: { flex: 1, backgroundColor: '#F4F7FB', justifyContent: 'center', paddingHorizontal: 30 },
  authLogoBox: { alignItems: 'center', marginBottom: 50 },
  authWelcomeText: { fontSize: 16, color: '#8D99AE', fontWeight: '600', marginTop: 20, textTransform: 'uppercase', letterSpacing: 2 },
  authTitleText: { fontSize: 36, fontWeight: '900', color: '#1E293B', marginTop: 5 },
  authActionBox: { gap: 15 },
  authPrimaryBtn: { flexDirection: 'row', backgroundColor: '#4361EE', paddingVertical: 18, borderRadius: 16, alignItems: 'center', justifyContent: 'center', shadowColor: '#4361EE', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
  authPrimaryBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  authSecondaryBtn: { flexDirection: 'row', backgroundColor: '#E2E8F0', paddingVertical: 18, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  authSecondaryBtnText: { color: '#64748B', fontSize: 16, fontWeight: '700' },
  authBackBtn: { position: 'absolute', top: 60, left: 30, zIndex: 10, padding: 10, backgroundColor: '#E2E8F0', borderRadius: 12 },
  authFormBox: { backgroundColor: '#FFF', padding: 24, borderRadius: 24, shadowColor: '#1E293B', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.05, shadowRadius: 16, elevation: 5 },
  authInput: { backgroundColor: '#F8FAFC', padding: 18, borderRadius: 16, fontSize: 16, color: '#1E293B', fontWeight: '500', borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 15 },

  // APP STYLES
  container: { flex: 1, backgroundColor: '#F4F7FB', paddingTop: 60 },
  headerContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, marginBottom: 20 },
  headerTitle: { fontSize: 26, fontWeight: '800', color: '#1E293B', letterSpacing: -0.5 },
  langButton: { backgroundColor: '#E2E8F0', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  langButtonText: { fontSize: 14, fontWeight: 'bold', color: '#1E293B' },

  inputCard: { backgroundColor: '#FFFFFF', marginHorizontal: 20, padding: 24, borderRadius: 24, shadowColor: '#4361EE', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 5, marginBottom: 24 },
  dateSelectorRow: { flexDirection: 'row', marginBottom: 20 },
  dateSelectorBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0F4FF', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#DCE4FF' },
  dateSelectorText: { fontSize: 15, color: '#4361EE', fontWeight: '700' },
  dropdownSelector: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F8FAFC', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0' },
  dropdownTextPlaceholder: { color: '#A0AABF', fontSize: 15, fontWeight: '500' },
  dropdownTextActive: { color: '#1E293B', fontSize: 15, fontWeight: '700' },

  row: { flexDirection: 'row', justifyContent: 'space-between' },
  halfInputContainer: { width: '47%' },
  inputLabel: { fontSize: 12, fontWeight: '700', color: '#8D99AE', marginBottom: 8, letterSpacing: 1 },
  input: { backgroundColor: '#F8FAFC', padding: 16, marginBottom: 20, borderRadius: 16, fontSize: 16, color: '#1E293B', fontWeight: '600', borderWidth: 1, borderColor: '#E2E8F0' },
  unitToggleContainer: { flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: 12, padding: 4, marginBottom: 20 },
  unitOption: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 10, borderRadius: 10 },
  unitOptionActive: { backgroundColor: '#4361EE' },
  unitOptionText: { fontSize: 13, fontWeight: '600', color: '#64748B' },
  unitOptionTextActive: { color: '#FFFFFF' },
  measurementInputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 20, paddingRight: 16 },
  measurementInput: { flex: 1, padding: 16, fontSize: 16, color: '#1E293B', fontWeight: '600' },
  measurementUnitSuffix: { fontSize: 14, color: '#8D99AE', fontWeight: '600' },
  
  formActionRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  cancelButton: { backgroundColor: '#F1F5F9', paddingVertical: 16, borderRadius: 16, flex: 1, marginRight: 8, alignItems: 'center' },
  cancelButtonText: { color: '#64748B', fontSize: 16, fontWeight: '700' },
  saveButton: { flexDirection: 'row', backgroundColor: '#4361EE', paddingVertical: 16, borderRadius: 16, flex: 1, marginLeft: 8, alignItems: 'center', justifyContent: 'center' },
  saveButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },

  listContainer: { flex: 1, paddingHorizontal: 20 },
  listHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingHorizontal: 4 },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: '#1E293B' },
  calendarOverviewBtn: { backgroundColor: '#E2E8F0', padding: 10, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  addButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E293B', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20 },
  addButtonText: { color: '#FFF', fontWeight: '700', marginLeft: 6, fontSize: 14 },
  
  filterBadgeContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFECEC', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, alignSelf: 'flex-start', marginBottom: 16 },
  filterBadgeText: { color: '#EF233C', fontWeight: '700', marginRight: 8 },
  emptyText: { textAlign: 'center', color: '#8D99AE', marginTop: 20, fontSize: 16, fontStyle: 'italic' },

  workoutCard: { flexDirection: 'row', backgroundColor: '#FFFFFF', marginBottom: 16, borderRadius: 20, alignItems: 'center', shadowColor: '#1E293B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 12, elevation: 2, overflow: 'hidden' },
  cardAccentBar: { width: 6, height: '100%', backgroundColor: '#4361EE' }, 
  workoutInfo: { flex: 1, paddingVertical: 16, paddingLeft: 16 },
  workoutName: { fontSize: 18, fontWeight: '800', color: '#1E293B', marginBottom: 6 },
  workoutStats: { fontSize: 15, color: '#64748B', marginBottom: 8 },
  statHighlight: { color: '#1E293B', fontWeight: '600' },
  statHighlightBold: { color: '#1E293B', fontWeight: '800' },

  measurementTag: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F5F9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  measurementTagText: { fontSize: 13, color: '#486581', marginLeft: 4, fontWeight: '500' },
  dateRow: { flexDirection: 'row', alignItems: 'center' },
  workoutDate: { fontSize: 13, color: '#8D99AE', marginLeft: 4, fontWeight: '500' },
  
  cardActionsContainer: { flexDirection: 'row', paddingHorizontal: 16, alignItems: 'center', gap: 10 },
  editActionBtn: { backgroundColor: '#4361EE', padding: 12, borderRadius: 14 },
  deleteActionBtn: { backgroundColor: '#EF233C', padding: 12, borderRadius: 14 },

  modalBackground: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 22, fontWeight: '800', color: '#1E293B' },
  customExerciseRow: { flexDirection: 'row', marginBottom: 24 },
  customExerciseInput: { flex: 1, backgroundColor: '#F8FAFC', padding: 16, borderRadius: 16, fontSize: 16, color: '#1E293B', marginRight: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  customExerciseBtn: { backgroundColor: '#4361EE', paddingHorizontal: 20, justifyContent: 'center', borderRadius: 16 },
  modalItemContainer: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  modalItemTextContainer: { flex: 1, paddingVertical: 18 },
  modalItemText: { fontSize: 17, color: '#1E293B', fontWeight: '600' },
  modalCloseButton: { marginTop: 20, padding: 15, backgroundColor: '#F1F5F9', borderRadius: 16, alignItems: 'center' },
  modalCloseText: { color: '#1E293B', fontSize: 16, fontWeight: '700' },

  // STATS STYLES
  statsContainer: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statBox: { flex: 1, backgroundColor: '#FFFFFF', padding: 16, borderRadius: 16, alignItems: 'center', shadowColor: '#1E293B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 12, elevation: 2 },
  statBoxLabel: { fontSize: 12, color: '#8D99AE', fontWeight: '700', textTransform: 'uppercase', marginBottom: 4, letterSpacing: 0.5 },
  statBoxValue: { fontSize: 20, color: '#1E293B', fontWeight: '800' },

  // SETTINGS STYLES
  settingsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  settingsRowText: { fontSize: 16, color: '#1E293B', fontWeight: '600' },
  settingsRowValue: { fontSize: 16, color: '#64748B', fontWeight: '500' },
  dangerZone: { marginTop: 30, paddingTop: 20, borderTopWidth: 1, borderTopColor: '#FEE2E2' },
  dangerZoneTitle: { fontSize: 12, fontWeight: '800', color: '#EF4444', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },
  deleteAccountBtn: { flexDirection: 'row', backgroundColor: '#EF233C', paddingVertical: 16, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  deleteAccountBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});