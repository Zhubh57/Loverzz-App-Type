import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db, auth } from '../services/firebase';

const DAILY_QUESTIONS = [
  "What is our favorite memory from last summer?",
  "If we could travel anywhere tomorrow, where would we go?",
  "What's one thing you appreciate about our relationship?",
  "What meal would you eat for the rest of your life?",
  "What is your biggest fear right now?",
  "What always makes you laugh out loud?"
];

// Helper to get day of year properly
const getDayOfYear = (date: Date) => {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = (date.getTime() - start.getTime()) + ((start.getTimezoneOffset() - date.getTimezoneOffset()) * 60 * 1000);
  return Math.floor(diff / 86400000);
};

export default function QuizScreen() {
  const [question, setQuestion] = useState('');
  const [dateStr, setDateStr] = useState('');
  const [coupleId, setCoupleId] = useState<string | null>(null);
  
  const [myAnswer, setMyAnswer] = useState('');
  const [myGuess, setMyGuess] = useState('');
  
  const [answersData, setAnswersData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const today = new Date();
    const dStr = today.toISOString().split('T')[0];
    setDateStr(dStr);
    
    const dayOfYear = getDayOfYear(today);
    setQuestion(DAILY_QUESTIONS[dayOfYear % DAILY_QUESTIONS.length]);

    if (!auth.currentUser) return;
    
    const unsubUser = onSnapshot(doc(db, 'users', auth.currentUser.uid), (snap) => {
      if (snap.exists() && snap.data().coupleId) {
        const cid = snap.data().coupleId;
        setCoupleId(cid);

        // Fetch answers for today
        const ansRef = doc(db, 'answers', `${cid}_${dStr}`);
        onSnapshot(ansRef, (ansSnap) => {
          if (ansSnap.exists()) {
            setAnswersData(ansSnap.data());
          } else {
            setAnswersData(null);
          }
          setLoading(false);
        });
      }
    });

    return () => unsubUser();
  }, []);

  const handleSubmit = async () => {
    if (!coupleId || !myAnswer.trim() || !myGuess.trim()) return;
    try {
      const isUser1 = answersData?.user1Id === auth.currentUser?.uid || !answersData?.user1Id;
      
      const payload: any = {};
      if (isUser1 && !answersData?.user1Id) {
        payload.user1Id = auth.currentUser?.uid;
      }
      
      if (auth.currentUser?.uid === answersData?.user1Id || isUser1) {
        payload.user1Answer = myAnswer;
        payload.user1Guess = myGuess;
      } else {
        payload.user2Id = auth.currentUser?.uid;
        payload.user2Answer = myAnswer;
        payload.user2Guess = myGuess;
      }

      await setDoc(doc(db, 'answers', `${coupleId}_${dateStr}`), payload, { merge: true });
    } catch (e: any) {
      alert("Failed to submit: " + e.message);
    }
  };

  if (loading) return <View style={styles.center}><Text>Loading quiz...</Text></View>;

  const iAmUser1 = answersData?.user1Id === auth.currentUser?.uid;
  const iAmUser2 = answersData?.user2Id === auth.currentUser?.uid;
  const mySubmitted = iAmUser1 ? !!answersData?.user1Answer : (iAmUser2 ? !!answersData?.user2Answer : false);
  const bothSubmitted = !!answersData?.user1Answer && !!answersData?.user2Answer;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>Daily Quiz</Text>
      <View style={styles.card}>
        <Text style={styles.date}>{dateStr}</Text>
        <Text style={styles.question}>{question}</Text>
      </View>

      {!mySubmitted ? (
        <View style={styles.form}>
          <Text style={styles.label}>Your Answer:</Text>
          <TextInput style={styles.input} value={myAnswer} onChangeText={setMyAnswer} multiline />
          
          <Text style={styles.label}>Guess Partner's Answer:</Text>
          <TextInput style={styles.input} value={myGuess} onChangeText={setMyGuess} multiline />

          <TouchableOpacity style={styles.button} onPress={handleSubmit}>
            <Text style={styles.buttonText}>Submit & Lock</Text>
          </TouchableOpacity>
        </View>
      ) : !bothSubmitted ? (
        <View style={styles.waitingBlock}>
          <Text style={styles.waitingText}>Waiting for your partner to answer before revealing!</Text>
        </View>
      ) : (
        <View style={styles.revealBlock}>
          <Text style={styles.revealTitle}>Answers Revealed!</Text>
          
          <View style={styles.revealRow}>
            <View style={styles.revealBox}>
              <Text style={styles.boxTitle}>Your Answer</Text>
              <Text style={styles.boxText}>{iAmUser1 ? answersData.user1Answer : answersData.user2Answer}</Text>
            </View>
            <View style={styles.revealBox}>
              <Text style={styles.boxTitle}>Partner's Answer</Text>
              <Text style={styles.boxText}>{iAmUser1 ? answersData.user2Answer : answersData.user1Answer}</Text>
            </View>
          </View>

          <View style={styles.revealRow}>
            <View style={styles.revealBox}>
              <Text style={styles.boxTitle}>Your Guess</Text>
              <Text style={styles.boxText}>{iAmUser1 ? answersData.user1Guess : answersData.user2Guess}</Text>
            </View>
            <View style={styles.revealBox}>
              <Text style={styles.boxTitle}>Partner's Guess</Text>
              <Text style={styles.boxText}>{iAmUser1 ? answersData.user2Guess : answersData.user1Guess}</Text>
            </View>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 20, backgroundColor: '#FFF0F5', paddingTop: 60 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { fontSize: 28, fontWeight: 'bold', color: '#FF6B6B', marginBottom: 20, textAlign: 'center' },
  card: { backgroundColor: '#8E2DE2', padding: 20, borderRadius: 15, marginBottom: 20, alignItems: 'center' },
  date: { color: '#E0E0E0', fontSize: 14, marginBottom: 5 },
  question: { color: '#FFF', fontSize: 22, fontWeight: 'bold', textAlign: 'center' },
  form: { marginTop: 10 },
  label: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 5 },
  input: { backgroundColor: '#FFF', padding: 15, borderRadius: 10, borderWidth: 1, borderColor: '#FFE4E1', marginBottom: 20, minHeight: 80, textAlignVertical: 'top' },
  button: { backgroundColor: '#FF6B6B', padding: 15, borderRadius: 10, alignItems: 'center' },
  buttonText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  waitingBlock: { backgroundColor: '#FFF', padding: 20, borderRadius: 15, alignItems: 'center', elevation: 2 },
  waitingText: { fontSize: 18, color: '#8E2DE2', fontWeight: 'bold', textAlign: 'center' },
  revealBlock: { marginTop: 10 },
  revealTitle: { fontSize: 22, fontWeight: 'bold', color: '#FF6B6B', textAlign: 'center', marginBottom: 15 },
  revealRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  revealBox: { flex: 0.48, backgroundColor: '#FFF', padding: 15, borderRadius: 12, elevation: 2 },
  boxTitle: { fontSize: 12, color: '#888', marginBottom: 5, textTransform: 'uppercase', fontWeight: 'bold' },
  boxText: { fontSize: 16, color: '#333', fontWeight: '500' }
});
