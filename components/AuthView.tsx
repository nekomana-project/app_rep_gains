import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { styles } from '../app/styles';

// We pass in all the state and functions this view needs
interface AuthViewProps {
  appMode: 'gatekeeper' | 'login_form' | 'register_form';
  setAppMode: (mode: any) => void;
  email: string;
  setEmail: (val: string) => void;
  password: string;
  setPassword: (val: string) => void;
  isLoading: boolean;
  handleLogin: () => void;
  handleRegister: () => void;
  handleContinueOffline: () => void;
  handleForgotPassword: () => void;
  t: any; // The translations dictionary
  DismissKeyboardView: any; // The web keyboard fix
}

export default function AuthView(props: AuthViewProps) {
  const { appMode, setAppMode, email, setEmail, password, setPassword, isLoading, handleLogin, handleRegister, handleContinueOffline, handleForgotPassword, t, DismissKeyboardView } = props;

  if (appMode === 'gatekeeper') {
    return (
      <View style={styles.authContainer}>
        <View style={styles.authLogoBox}>
          <Ionicons name="barbell" size={80} color="#4361EE" />
          <Text style={styles.authWelcomeText}>{t.welcome}</Text>
          <Text style={styles.authTitleText}>{t.appTitle}</Text>
        </View>
        <View style={styles.authActionBox}>
          <TouchableOpacity style={styles.authPrimaryBtn} onPress={() => setAppMode('login_form')}><Ionicons name="log-in-outline" size={20} color="#FFF" style={{marginRight: 8}}/><Text style={styles.authPrimaryBtnText}>Login</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.authPrimaryBtn, {backgroundColor: '#10B981', shadowColor: '#10B981'}]} onPress={() => setAppMode('register_form')}><Ionicons name="person-add-outline" size={20} color="#FFF" style={{marginRight: 8}}/><Text style={styles.authPrimaryBtnText}>Register</Text></TouchableOpacity>
          <TouchableOpacity style={styles.authSecondaryBtn} onPress={handleContinueOffline}><Ionicons name="phone-portrait-outline" size={20} color="#64748B" style={{marginRight: 8}}/><Text style={styles.authSecondaryBtnText}>{t.continueOffline}</Text></TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <DismissKeyboardView>
      <View style={styles.authContainer}>
        <TouchableOpacity style={styles.authBackBtn} onPress={() => setAppMode('gatekeeper')}><Ionicons name="arrow-back" size={24} color="#1E293B" /></TouchableOpacity>
        <View style={styles.authLogoBox}>
          <Text style={styles.authTitleText}>{appMode === 'login_form' ? 'Welcome Back' : 'Create Account'}</Text>
        </View>
        <View style={styles.authFormBox}>
          <TextInput style={styles.authInput} placeholder={t.email} placeholderTextColor="#A0AABF" keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} />
          <TextInput style={styles.authInput} placeholder={t.password} placeholderTextColor="#A0AABF" secureTextEntry value={password} onChangeText={setPassword} />
          <TouchableOpacity style={[styles.authPrimaryBtn, appMode === 'register_form' && {backgroundColor: '#10B981', shadowColor: '#10B981'}, isLoading && { opacity: 0.7 }]} onPress={appMode === 'login_form' ? handleLogin : handleRegister} disabled={isLoading}>
            {isLoading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.authPrimaryBtnText}>{appMode === 'login_form' ? t.submitLogin : 'Create Account'}</Text>}
          </TouchableOpacity>
          {appMode === 'login_form' && (
            <TouchableOpacity style={{marginTop: 15, alignItems: 'center'}} onPress={handleForgotPassword} disabled={isLoading}><Text style={{color: '#4361EE', fontWeight: '600', fontSize: 14}}>{t.forgotPassword}</Text></TouchableOpacity>
          )}
        </View>
      </View>
    </DismissKeyboardView>
  );
}