import { Ionicons } from '@expo/vector-icons';
import { arrayRemove, arrayUnion, collection, doc, getDoc, getDocs, onSnapshot, query, updateDoc, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { styles } from '../constants/styles';
import { Workout } from '../constants/types';
import { auth, db } from '../firebaseConfig';

interface SocialModalProps {
  isVisible: boolean;
  onClose: () => void;
  t: any;
  friendCode: string;
  myWorkouts: Workout[];       
  myDisplayName: string;
  appMode: string; // 🔥 NEW: We check the app mode to strictly block offline users      
}

export default function SocialModal({ isVisible, onClose, t, friendCode, myWorkouts, myDisplayName, appMode }: SocialModalProps) {
  const [activeTab, setActiveTab] = useState<'leaderboard' | 'feed' | 'friends'>('leaderboard');
  const [searchCode, setSearchCode] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const [friendsList, setFriendsList] = useState<any[]>([]);
  const [pendingList, setPendingList] = useState<any[]>([]);

  // 📡 REAL-TIME LISTENER
  useEffect(() => {
    // 🔥 STRICT BLOCK: Abort if not explicitly in cloud mode
    if (!isVisible || appMode !== 'cloud_app' || !auth.currentUser) return;
    
    const myUid = auth.currentUser.uid;
    const unsubscribe = onSnapshot(doc(db, 'users', myUid), async (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const pendingUids = data.pendingRequests || [];
        const friendUids = data.friends || [];

        if (pendingUids.length > 0) {
          const pDocs = await Promise.all(pendingUids.map((id: string) => getDoc(doc(db, 'users', id))));
          setPendingList(pDocs.map(d => ({ uid: d.id, ...d.data() })));
        } else setPendingList([]);

        if (friendUids.length > 0) {
          const fDocs = await Promise.all(friendUids.map((id: string) => getDoc(doc(db, 'users', id))));
          setFriendsList(fDocs.map(d => ({ uid: d.id, ...d.data() })));
        } else setFriendsList([]);
      }
    });

    return () => unsubscribe();
  }, [isVisible, appMode]);

  const handleAddFriend = async () => {
    if (appMode !== 'cloud_app') return; // Strict Block

    const code = searchCode.trim().toUpperCase();
    if (!code) return;
    if (code === friendCode) { Alert.alert("Oops!", "You can't add yourself!"); return; }

    setIsSearching(true);
    try {
      const q = query(collection(db, 'users'), where('friendCode', '==', code));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        Alert.alert("Not Found", "Double check the code. No user found!");
      } else {
        const targetUserDoc = querySnapshot.docs[0];
        const targetData = targetUserDoc.data();

        if (targetData.pendingRequests?.includes(auth.currentUser?.uid) || targetData.friends?.includes(auth.currentUser?.uid)) {
          Alert.alert("Already Sent", "You are already friends or have a pending request.");
        } else {
          await updateDoc(doc(db, 'users', targetUserDoc.id), { pendingRequests: arrayUnion(auth.currentUser?.uid) });
          Alert.alert("Sent!", "Friend request delivered!");
          setSearchCode('');
        }
      }
    } catch (e) { Alert.alert("Error", "Something went wrong."); }
    setIsSearching(false);
  };

  const handleAccept = async (requesterUid: string) => {
    if (appMode !== 'cloud_app') return; // Strict Block
    const myUid = auth.currentUser?.uid;
    if (!myUid) return;
    try {
      await updateDoc(doc(db, 'users', myUid), { friends: arrayUnion(requesterUid), pendingRequests: arrayRemove(requesterUid) });
      await updateDoc(doc(db, 'users', requesterUid), { friends: arrayUnion(myUid) });
    } catch (e) { console.error(e); }
  };

  const handleDecline = async (requesterUid: string) => {
    if (appMode !== 'cloud_app') return; // Strict Block
    const myUid = auth.currentUser?.uid;
    if (!myUid) return;
    try { await updateDoc(doc(db, 'users', myUid), { pendingRequests: arrayRemove(requesterUid) }); } 
    catch (e) { console.error(e); }
  };

  const handleRemoveFriend = (friendUid: string, friendName: string) => {
    if (appMode !== 'cloud_app') return; // Strict Block
    Alert.alert(
      "Remove Friend",
      `Are you sure you want to remove ${friendName} from your friends list?`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Remove", 
          style: "destructive", 
          onPress: async () => {
            const myUid = auth.currentUser?.uid;
            if (!myUid) return;
            try {
              await updateDoc(doc(db, 'users', myUid), { friends: arrayRemove(friendUid) });
              await updateDoc(doc(db, 'users', friendUid), { friends: arrayRemove(myUid) });
            } catch (e) { Alert.alert("Error", "Failed to remove friend."); }
          }
        }
      ]
    );
  };

  // ==========================================
  // 🔥 LEADERBOARD & FEED CALCULATIONS 🔥
  // ==========================================
  
  const isWithinLast7Days = (dateStr: string) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - d.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    return diffDays <= 7;
  };

  const allUsers = [
    ...friendsList, 
    { uid: auth.currentUser?.uid || 'me', displayName: myDisplayName || 'Me', workouts: myWorkouts, isMe: true }
  ];

  const leaderboardData = allUsers.map(user => {
    const recentWorkouts = (user.workouts || []).filter((w: Workout) => isWithinLast7Days(w.date));
    const totalCals = recentWorkouts.reduce((sum: number, w: Workout) => sum + (w.calories || 0), 0);
    return { ...user, totalCals };
  }).sort((a, b) => b.totalCals - a.totalCals);

  let feedData: any[] = [];
  allUsers.forEach(user => {
    const recentWorkouts = (user.workouts || []).filter((w: Workout) => isWithinLast7Days(w.date));
    recentWorkouts.forEach((w: Workout) => {
      feedData.push({ ...w, userName: user.displayName, isMe: user.isMe });
    });
  });
  feedData.sort((a, b) => Number(b.id) - Number(a.id));

  // --- RENDERING ---
  
  // 🔥 FIXED: We now check appMode instead of just auth.currentUser!
  if (appMode !== 'cloud_app') {
    return (
      <Modal visible={isVisible} transparent={true} animationType="slide">
        <View style={[styles.modalBackground, { justifyContent: 'flex-start', paddingTop: 60 }]}>
          <View style={[styles.modalContent, { flex: 1, borderTopLeftRadius: 32, borderTopRightRadius: 32, alignItems: 'center', justifyContent: 'center' }]}>
            <Ionicons name="cloud-offline" size={80} color="#E2E8F0" />
            <Text style={{ fontSize: 20, fontWeight: '800', color: '#1E293B', marginTop: 20 }}>Cloud Required</Text>
            <Text style={{ color: '#8D99AE', textAlign: 'center', marginTop: 10, paddingHorizontal: 40 }}>{t.offlineSocialMsg}</Text>
            <TouchableOpacity style={[styles.authPrimaryBtn, { marginTop: 30, width: '80%' }]} onPress={onClose}><Text style={styles.authPrimaryBtnText}>{t.close || "Close"}</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={isVisible} transparent={true} animationType="slide">
      <View style={[styles.modalBackground, { justifyContent: 'flex-start', paddingTop: 60 }]}>
        <View style={[styles.modalContent, { flex: 1, borderTopLeftRadius: 32, borderTopRightRadius: 32 }]}>
          
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t.socialTitle || "Community"}</Text>
            <TouchableOpacity onPress={onClose}><Ionicons name="close-circle" size={28} color="#8D99AE" /></TouchableOpacity>
          </View>

          <View style={{ flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: 12, padding: 4, marginBottom: 20 }}>
            <TouchableOpacity style={[styles.unitOption, activeTab === 'leaderboard' && styles.unitOptionActive]} onPress={() => setActiveTab('leaderboard')}>
              <Text style={[styles.unitOptionText, activeTab === 'leaderboard' && styles.unitOptionTextActive]}>🏆 Rank</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.unitOption, activeTab === 'feed' && styles.unitOptionActive]} onPress={() => setActiveTab('feed')}>
              <Text style={[styles.unitOptionText, activeTab === 'feed' && styles.unitOptionTextActive]}>⚡ Feed</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.unitOption, activeTab === 'friends' && styles.unitOptionActive]} onPress={() => setActiveTab('friends')}>
              <Text style={[styles.unitOptionText, activeTab === 'friends' && styles.unitOptionTextActive]}>👤 Friends</Text>
            </TouchableOpacity>
          </View>

          {/* TAB 1: LEADERBOARD */}
          {activeTab === 'leaderboard' && (
            <View style={{ flex: 1 }}>
              <Text style={[styles.inputLabel, {marginBottom: 10}]}>LAST 7 DAYS (CALORIES 🔥)</Text>
              <FlatList
                data={leaderboardData}
                keyExtractor={(item) => item.uid}
                showsVerticalScrollIndicator={false}
                renderItem={({ item, index }) => (
                  <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: item.isMe ? '#EDF2FF' : '#FFF', padding: 16, borderRadius: 16, marginBottom: 10, borderWidth: 1, borderColor: item.isMe ? '#4361EE' : '#F1F5F9' }}>
                    <View style={{ width: 30 }}><Text style={{ fontSize: 20, fontWeight: '900', color: index === 0 ? '#F59E0B' : index === 1 ? '#94A3B8' : index === 2 ? '#B45309' : '#CBD5E1' }}>#{index + 1}</Text></View>
                    <View style={{ width: 40, height: 40, backgroundColor: '#E2E8F0', borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: 15 }}><Text style={{ fontSize: 18, fontWeight: '800', color: '#64748B' }}>{item.displayName?.charAt(0).toUpperCase()}</Text></View>
                    <View style={{ flex: 1 }}><Text style={{ fontSize: 16, fontWeight: '800', color: '#1E293B' }}>{item.displayName} {item.isMe && '(You)'}</Text></View>
                    <View style={{ alignItems: 'flex-end' }}><Text style={{ fontSize: 18, fontWeight: '900', color: '#EF233C' }}>{item.totalCals}</Text><Text style={{ fontSize: 10, fontWeight: '700', color: '#8D99AE' }}>KCAL</Text></View>
                  </View>
                )}
              />
            </View>
          )}

          {/* TAB 2: ACTIVITY FEED */}
          {activeTab === 'feed' && (
            <View style={{ flex: 1 }}>
              <Text style={[styles.inputLabel, {marginBottom: 10}]}>RECENT WORKOUTS</Text>
              {feedData.length === 0 ? (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="flash-outline" size={64} color="#E2E8F0" />
                  <Text style={{ color: '#8D99AE', marginTop: 10, fontWeight: '600' }}>No recent activity.</Text>
                </View>
              ) : (
                <FlatList
                  data={feedData}
                  keyExtractor={(item, index) => `${item.id}-${index}`}
                  showsVerticalScrollIndicator={false}
                  renderItem={({ item }) => (
                    <View style={{ flexDirection: 'row', marginBottom: 20 }}>
                      <View style={{ width: 40, alignItems: 'center' }}>
                        <View style={{ width: 40, height: 40, backgroundColor: item.isMe ? '#4361EE' : '#1E293B', borderRadius: 20, alignItems: 'center', justifyContent: 'center', zIndex: 2 }}><Ionicons name="barbell" size={20} color="#FFF" /></View>
                        <View style={{ width: 2, flex: 1, backgroundColor: '#E2E8F0', marginTop: -5, zIndex: 1 }} />
                      </View>
                      
                      <View style={{ flex: 1, backgroundColor: '#F8FAFC', padding: 16, borderRadius: 16, marginLeft: 15, borderWidth: 1, borderColor: '#E2E8F0' }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                          <Text style={{ fontSize: 14, fontWeight: '800', color: '#1E293B' }}>{item.userName}</Text>
                          <Text style={{ fontSize: 12, fontWeight: '600', color: '#8D99AE' }}>{item.date}</Text>
                        </View>
                        <Text style={{ fontSize: 15, color: '#475569', marginBottom: 8, lineHeight: 22 }}>Logged <Text style={{fontWeight: '700'}}>{item.sets} sets</Text> of <Text style={{fontWeight: '700'}}>{item.name}</Text>.</Text>
                        {(item.calories > 0 || item.value) && (
                          <View style={{ flexDirection: 'row', gap: 10 }}>
                            {item.calories > 0 && <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF0F0', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}><Text style={{ fontSize: 12, fontWeight: '700', color: '#EF233C' }}>🔥 {item.calories} kcal</Text></View>}
                            {item.value && <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#E2E8F0', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}><Text style={{ fontSize: 12, fontWeight: '700', color: '#475569' }}>{item.value} {item.unit}</Text></View>}
                          </View>
                        )}
                      </View>
                    </View>
                  )}
                />
              )}
            </View>
          )}

          {/* TAB 3: FRIENDS LIST */}
          {activeTab === 'friends' && (
            <View style={{ flex: 1 }}>
              <Text style={styles.inputLabel}>ADD FRIEND BY CODE</Text>
              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
                <TextInput style={[styles.input, { flex: 1, marginBottom: 0, textTransform: 'uppercase' }]} placeholder="e.g. NEKO-9" value={searchCode} onChangeText={setSearchCode} maxLength={6} />
                <TouchableOpacity style={{ backgroundColor: '#4361EE', justifyContent: 'center', paddingHorizontal: 20, borderRadius: 16 }} onPress={handleAddFriend} disabled={isSearching}>
                  {isSearching ? <ActivityIndicator color="#FFF" /> : <Ionicons name="person-add" size={20} color="#FFF" />}
                </TouchableOpacity>
              </View>

              <Text style={[styles.inputLabel, {marginBottom: 20}]}>YOUR CODE: <Text style={{color: '#4361EE'}}>{friendCode}</Text></Text>

              {pendingList.length > 0 && (
                <View style={{ marginBottom: 20, backgroundColor: '#FFFBEB', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#FDE68A' }}>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#D97706', marginBottom: 10 }}>PENDING REQUESTS</Text>
                  {pendingList.map(req => (
                    <View key={req.uid} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <Text style={{ fontSize: 16, fontWeight: '700', color: '#1E293B' }}>{req.displayName}</Text>
                      <View style={{ flexDirection: 'row', gap: 10 }}>
                        <TouchableOpacity onPress={() => handleDecline(req.uid)} style={{ backgroundColor: '#EF233C', padding: 8, borderRadius: 8 }}><Ionicons name="close" size={16} color="#FFF" /></TouchableOpacity>
                        <TouchableOpacity onPress={() => handleAccept(req.uid)} style={{ backgroundColor: '#10B981', padding: 8, borderRadius: 8 }}><Ionicons name="checkmark" size={16} color="#FFF" /></TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              <Text style={styles.inputLabel}>MY FRIENDS ({friendsList.length})</Text>
              {friendsList.length === 0 ? (
                <View style={{ alignItems: 'center', marginTop: 40 }}>
                  <Ionicons name="people-outline" size={64} color="#E2E8F0" />
                  <Text style={{ color: '#8D99AE', marginTop: 10, fontWeight: '600' }}>No friends added yet.</Text>
                </View>
              ) : (
                <FlatList
                  data={friendsList}
                  keyExtractor={(item) => item.uid}
                  showsVerticalScrollIndicator={false}
                  renderItem={({ item }) => (
                    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}>
                      <View style={{ width: 40, height: 40, backgroundColor: '#E2E8F0', borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: 15 }}><Text style={{ fontSize: 18, fontWeight: '800', color: '#64748B' }}>{item.displayName?.charAt(0).toUpperCase()}</Text></View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 16, fontWeight: '700', color: '#1E293B' }}>{item.displayName}</Text>
                        {item.shareWeight && item.userWeight && <Text style={{ fontSize: 12, color: '#8D99AE', marginTop: 2 }}>{item.userWeight} {item.userWeightUnit}</Text>}
                      </View>
                      <TouchableOpacity onPress={() => handleRemoveFriend(item.uid, item.displayName)} style={{ padding: 10 }}><Ionicons name="person-remove" size={20} color="#EF233C" /></TouchableOpacity>
                    </View>
                  )}
                />
              )}
            </View>
          )}

        </View>
      </View>
    </Modal>
  );
}