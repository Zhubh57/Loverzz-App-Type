import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, db } from './src/services/firebase';
import { doc, getDoc } from 'firebase/firestore';

import AuthScreen from './src/screens/AuthScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import QuizScreen from './src/screens/QuizScreen';
import TimelineScreen from './src/screens/TimelineScreen';
import DoodleScreen from './src/screens/DoodleScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [coupleId, setCoupleId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubUser: any;
    const unsubscribeAuth = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser(u);
        // Listen to user doc for coupleId updates
        unsubUser = onSnapshot(doc(db, 'users', u.uid), (snap) => {
          if (snap.exists() && snap.data().coupleId) {
            setCoupleId(snap.data().coupleId);
          } else {
            setCoupleId(null);
          }
          setLoading(false);
        });
      } else {
        setUser(null);
        setCoupleId(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      unsubUser && unsubUser();
    };
  }, []);

  if (loading) return null; // Or a splash screen

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user || !coupleId ? (
          <Stack.Screen name="Auth" component={AuthScreen} />
        ) : (
          <>
            <Stack.Screen name="Dashboard" component={DashboardScreen} initialParams={{ coupleId }} />
            <Stack.Screen name="Quiz" component={QuizScreen} />
            <Stack.Screen name="Timeline" component={TimelineScreen} />
            <Stack.Screen name="Doodle" component={DoodleScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
