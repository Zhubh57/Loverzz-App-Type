import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../services/firebase';

export default function AuthScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const handleAuth = async () => {
    setLoading(true);
    try {
      if (mode === 'REGISTER') {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await setDoc(doc(db, 'users', cred.user.uid), { email, createdAt: new Date() });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      setIsAuthenticated(true);
    } catch (e: any) {
      alert(e.message);
    }
    setLoading(false);
  };

  const handleGenerateCode = async () => {
    if (!auth.currentUser) return;
    setLoading(true);
    try {
      const newCoupleId = Math.random().toString(36).substring(2, 8).toUpperCase();
      // Create couple doc
      await setDoc(doc(db, 'couples', newCoupleId), {
        user1: auth.currentUser.uid,
        startDate: new Date(),
        latestNote: ''
      });
      // Update user doc
      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        coupleId: newCoupleId
      });
    } catch (e: any) {
      alert(e.message);
    }
    setLoading(false);
  };

  const handleJoinCode = async () => {
    if (!auth.currentUser || !inviteCode) return;
    setLoading(true);
    try {
      const coupleRef = doc(db, 'couples', inviteCode);
      const coupleSnap = await getDoc(coupleRef);
      if (!coupleSnap.exists()) throw new Error('Invalid code');
      if (coupleSnap.data().user2) throw new Error('Couple already full');

      await updateDoc(coupleRef, { user2: auth.currentUser.uid });
      await updateDoc(doc(db, 'users', auth.currentUser.uid), { coupleId: inviteCode });
    } catch (e: any) {
      alert(e.message);
    }
    setLoading(false);
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#FF6B6B" /></View>;
  }

  if (isAuthenticated) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Pair with your partner</Text>
        <TouchableOpacity style={styles.button} onPress={handleGenerateCode}>
          <Text style={styles.buttonText}>Generate New Invite Code</Text>
        </TouchableOpacity>
        <Text style={styles.or}>OR</Text>
        <TextInput 
          style={styles.input} 
          placeholder="Enter Partner's Code" 
          value={inviteCode} 
          onChangeText={setInviteCode} 
          autoCapitalize="characters"
        />
        <TouchableOpacity style={[styles.button, { backgroundColor: '#8E2DE2' }]} onPress={handleJoinCode}>
          <Text style={styles.buttonText}>Join Code</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Loverzz</Text>
      <TextInput style={styles.input} placeholder="Email" value={email} onChangeText={setEmail} autoCapitalize="none" />
      <TextInput style={styles.input} placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry />
      <TouchableOpacity style={styles.button} onPress={handleAuth}>
        <Text style={styles.buttonText}>{mode === 'LOGIN' ? 'Log In' : 'Sign Up'}</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => setMode(mode === 'LOGIN' ? 'REGISTER' : 'LOGIN')}>
        <Text style={styles.switchText}>
          {mode === 'LOGIN' ? "Don't have an account? Sign Up" : "Already have an account? Log In"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: '#FFF0F5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF0F5' },
  title: { fontSize: 32, fontWeight: 'bold', textAlign: 'center', marginBottom: 40, color: '#FF6B6B' },
  input: { backgroundColor: '#FFF', padding: 15, borderRadius: 10, marginBottom: 15, borderWidth: 1, borderColor: '#FFE4E1' },
  button: { backgroundColor: '#FF6B6B', padding: 15, borderRadius: 10, alignItems: 'center' },
  buttonText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  or: { textAlign: 'center', marginVertical: 20, color: '#A9A9A9', fontWeight: 'bold' },
  switchText: { textAlign: 'center', marginTop: 20, color: '#FF6B6B' }
});
