import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList, Image, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { collection, onSnapshot, addDoc, query, orderBy, serverTimestamp, doc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage, auth } from '../services/firebase';

export default function TimelineScreen() {
  const [memories, setMemories] = useState<any[]>([]);
  const [caption, setCaption] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [coupleId, setCoupleId] = useState<string | null>(null);

  useEffect(() => {
    let unsubMemories: any;
    
    if (auth.currentUser) {
      const unsubUser = onSnapshot(doc(db, 'users', auth.currentUser.uid), (snap) => {
        if (snap.exists() && snap.data().coupleId) {
          const cid = snap.data().coupleId;
          setCoupleId(cid);

          const q = query(collection(db, `memories/${cid}/items`), orderBy('createdAt', 'desc'));
          unsubMemories = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setMemories(data);
          });
        }
      });
      return () => {
        unsubUser();
        if (unsubMemories) unsubMemories();
      };
    }
  }, []);

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  const uploadMemory = async () => {
    if (!coupleId || !imageUri || !caption.trim()) return;
    setLoading(true);

    try {
      const response = await fetch(imageUri);
      const blob = await response.blob();
      const filename = `memories/${coupleId}/${Date.now()}.jpg`;
      const storageRef = ref(storage, filename);
      
      await uploadBytes(storageRef, blob);
      const downloadURL = await getDownloadURL(storageRef);

      await addDoc(collection(db, `memories/${coupleId}/items`), {
        imageUrl: downloadURL,
        caption: caption.trim(),
        authorId: auth.currentUser?.uid,
        createdAt: serverTimestamp()
      });

      setCaption('');
      setImageUri(null);
    } catch (e: any) {
      alert('Upload failed: ' + e.message);
    }
    setLoading(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Memory Timeline</Text>
      
      <View style={styles.composer}>
        <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.previewImage} />
          ) : (
             <Text style={styles.imagePickerText}>+ Add Photo</Text>
          )}
        </TouchableOpacity>
        
        <TextInput 
          style={styles.input} 
          placeholder="Write a caption..." 
          value={caption} 
          onChangeText={setCaption} 
          multiline
        />

        <TouchableOpacity 
          style={[styles.button, (!imageUri || !caption) && styles.buttonDisabled]} 
          onPress={uploadMemory} 
          disabled={!imageUri || !caption || loading}
        >
          {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.buttonText}>Post Memory</Text>}
        </TouchableOpacity>
      </View>

      <FlatList
        data={memories}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.memoryCard}>
            <Image source={{ uri: item.imageUrl }} style={styles.memoryImage} />
            <Text style={styles.memoryCaption}>{item.caption}</Text>
          </View>
        )}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#FFF0F5', paddingTop: 60 },
  header: { fontSize: 28, fontWeight: 'bold', color: '#FF6B6B', marginBottom: 20, textAlign: 'center' },
  composer: { backgroundColor: '#FFF', padding: 15, borderRadius: 15, marginBottom: 20, elevation: 3 },
  imagePicker: { height: 150, backgroundColor: '#F0F0F0', borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 10, overflow: 'hidden' },
  previewImage: { width: '100%', height: '100%' },
  imagePickerText: { color: '#888', fontWeight: 'bold' },
  input: { backgroundColor: '#F9F9F9', padding: 10, borderRadius: 10, minHeight: 60, textAlignVertical: 'top', marginBottom: 10 },
  button: { backgroundColor: '#8E2DE2', padding: 15, borderRadius: 10, alignItems: 'center' },
  buttonDisabled: { backgroundColor: '#CBA4EA' },
  buttonText: { color: '#FFF', fontWeight: 'bold' },
  memoryCard: { backgroundColor: '#FFF', borderRadius: 15, overflow: 'hidden', marginBottom: 20, elevation: 2 },
  memoryImage: { width: '100%', height: 250 },
  memoryCaption: { padding: 15, fontSize: 16, color: '#333', fontStyle: 'italic' }
});
