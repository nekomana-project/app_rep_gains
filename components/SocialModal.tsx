import { Ionicons } from '@expo/vector-icons';
import { arrayRemove, arrayUnion, collection, doc, getDoc, getDocs, onSnapshot, query, updateDoc, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { styles } from '../app/styles';
import { auth, db } from '../firebaseConfig';

interface SocialModalProps {
  isVisible: boolean;
  onClose: () => void;
  t: any;
  friendCode: string;
}

export default function SocialModal({ isVisible, onClose, t, friendCode }: SocialModalProps) {
  const [activeTab, setActiveTab] = useState<'leaderboard' | 'feed' | 'friends'>('leaderboard');
  const [searchCode, setSearchCode] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // Lists to hold our friends and requests
  const [friendsList, setFriendsList] = useState<any[]>([]);
  const [pendingList, setPendingList] = useState<any[]>([]);

  // 📡 REAL-TIME LISTENER: Watch for new friend requests or accepted friends
  useEffect(() => {
    if (!isVisible || !auth.currentUser) return;
    
    const myUid = auth.currentUser.uid;
    const unsubscribe = onSnapshot(doc(db, 'users', myUid), async (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const pendingUids = data.pendingRequests || [];
        const friendUids = data.friends || [];

        // Fetch display names for anyone in our Pending list
        if (pendingUids.length > 0) {
          const pDocs = await Promise.all(pendingUids.map((id: string) => getDoc(doc(db, 'users', id))));
          setPendingList(pDocs.map(d => ({ uid: d.id, ...d.data() })));
        } else {
          setPendingList([]);
        }

        // Fetch display names for our confirmed Friends
        if (friendUids.length > 0) {
          const fDocs = await Promise.all(friendUids.map((id: string) => getDoc(doc(db, 'users', id))));
          setFriendsList(fDocs.map(d => ({ uid: d.id, ...d.data() })));
        } else {
          setFriendsList([]);
        }
      }
    });

    return () => unsubscribe(); // Clean up listener when modal closes
  }, [isVisible]);

  // 🔍 SEND FRIEND REQUEST
  const handleAddFriend = async () => {
    const code = searchCode.trim().toUpperCase();
    if (!code) return;
    if (code === friendCode) {
      Alert.alert("Oops!", "You can't add yourself!");
      return;
    }

    setIsSearching(true);
    try {
      // Find the user with this friend code
      const q = query(collection(db, 'users'), where('friendCode', '==', code));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        Alert.alert("Not Found", "Double check the code. No user found!");
      } else {
        const targetUserDoc = querySnapshot.docs[0];
        const targetUid = targetUserDoc.id;
        const targetData = targetUserDoc.data();

        // Check if we are already friends or have a request pending
        if (targetData.pendingRequests?.includes(auth.currentUser?.uid) || targetData.friends?.includes(auth.currentUser?.uid)) {
          Alert.alert("Already Sent", "You are already friends or have a pending request.");
        } else {
          // Push our UID into their pendingRequests array
          await updateDoc(doc(db, 'users', targetUid), {
            pendingRequests: arrayUnion(auth.currentUser?.uid)
          });
          Alert.alert("Sent!", "Friend request delivered!");
          setSearchCode('');
        }
      }
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Something went wrong.");
    }
    setIsSearching(false);
  };

  // ✅ ACCEPT REQUEST
  const handleAccept = async (requesterUid: string) => {
    const myUid = auth.currentUser?.uid;
    if (!myUid) return;

    try {
      // 1. Add them to my friends, remove from my pending
      await updateDoc(doc(db, 'users', myUid), {
        friends: arrayUnion(requesterUid),
        pendingRequests: arrayRemove(requesterUid)
      });
      // 2. Add me to their friends
      await updateDoc(doc(db, 'users', requesterUid), {
        friends: arrayUnion(myUid)
      });
    } catch (e) {
      console.error(e);
    }
  };

  // ❌ DECLINE REQUEST
  const handleDecline = async (requesterUid: string) => {
    const myUid = auth.currentUser?.uid;
    if (!myUid) return;
    try {
      await updateDoc(doc(db, 'users', myUid), {
        pendingRequests: arrayRemove(requesterUid)
      });
    } catch (e) {
      console.error(e);
    }
  };

  // If user is not logged into the cloud, show a lock screen
  if (!auth.currentUser) {
    return (
      <Modal visible={isVisible} transparent={true} animationType="slide">
        <View style={[styles.modalBackground, { justifyContent: 'flex-start', paddingTop: 60 }]}>
          <View style={[styles.modalContent, { flex: 1, borderTopLeftRadius: 32, borderTopRightRadius: 32, alignItems: 'center', justifyContent: 'center' }]}>
            <Ionicons name="cloud-offline" size={80} color="#E2E8F0" />
            <Text style={{ fontSize: 20, fontWeight: '800', color: '#1E293B', marginTop: 20 }}>Cloud Required</Text>
            <Text style={{ color: '#8D99AE', textAlign: 'center', marginTop: 10, paddingHorizontal: 40 }}>
              {t.offlineSocialMsg || "Create a free cloud account to add friends and compete on the leaderboard!"}
            </Text>
            <TouchableOpacity style={[styles.authPrimaryBtn, { marginTop: 30, width: '80%' }]} onPress={onClose}>
              <Text style={styles.authPrimaryBtnText}>{t.close || "Close"}</Text>
            </TouchableOpacity>
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

          {/* 3-Tab Navigation */}
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

          {/* TAB 1 & 2: PLACEHOLDERS FOR NOW */}
          {activeTab === 'leaderboard' && (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="trophy-outline" size={64} color="#E2E8F0" />
              <Text style={{ color: '#8D99AE', marginTop: 10, fontWeight: '600' }}>Leaderboard coming next!</Text>
            </View>
          )}

          {activeTab === 'feed' && (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="flash-outline" size={64} color="#E2E8F0" />
              <Text style={{ color: '#8D99AE', marginTop: 10, fontWeight: '600' }}>Activity feed coming next!</Text>
            </View>
          )}

          {/* TAB 3: FRIENDS LIST */}
          {activeTab === 'friends' && (
            <View style={{ flex: 1 }}>
              <Text style={styles.inputLabel}>ADD FRIEND BY CODE</Text>
              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
                <TextInput 
                  style={[styles.input, { flex: 1, marginBottom: 0, textTransform: 'uppercase' }]} 
                  placeholder="e.g. NEKO-9" 
                  value={searchCode} 
                  onChangeText={setSearchCode} 
                  maxLength={6}
                />
                <TouchableOpacity 
                  style={{ backgroundColor: '#4361EE', justifyContent: 'center', paddingHorizontal: 20, borderRadius: 16 }}
                  onPress={handleAddFriend}
                  disabled={isSearching}
                >
                  {isSearching ? <ActivityIndicator color="#FFF" /> : <Ionicons name="person-add" size={20} color="#FFF" />}
                </TouchableOpacity>
              </View>

              <Text style={[styles.inputLabel, {marginBottom: 20}]}>YOUR CODE: <Text style={{color: '#4361EE'}}>{friendCode}</Text></Text>

              {/* Pending Requests Section */}
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

              {/* Friends List Section */}
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
                  renderItem={({ item }) => (
                    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}>
                      <View style={{ width: 40, height: 40, backgroundColor: '#E2E8F0', borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: 15 }}>
                        <Text style={{ fontSize: 18, fontWeight: '800', color: '#64748B' }}>{item.displayName?.charAt(0).toUpperCase()}</Text>
                      </View>
                      <View>
                        <Text style={{ fontSize: 16, fontWeight: '700', color: '#1E293B' }}>{item.displayName}</Text>
                        {item.shareWeight && item.userWeight && (
                          <Text style={{ fontSize: 12, color: '#8D99AE', marginTop: 2 }}>{item.userWeight} {item.userWeightUnit}</Text>
                        )}
                      </View>
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