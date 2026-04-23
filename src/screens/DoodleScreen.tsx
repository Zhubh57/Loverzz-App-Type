import React, { useState, useRef, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Dimensions, Alert } from 'react-native';
import { Canvas, Path, Skia, useTouchHandler, SkPath, ImageFormat } from '@shopify/react-native-skia';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, updateDoc } from 'firebase/firestore';
import { db, storage, auth } from '../services/firebase';
import { updateWidget } from '../modules/WidgetModule';
import * as FileSystem from 'expo-file-system';

const { width } = Dimensions.get('window');
const CANVAS_SIZE = width - 40;

interface Path {
  path: SkPath;
  color: string;
}

export default function DoodleScreen({ navigation, route }: any) {
  const [paths, setPaths] = useState<Path[]>([]);
  const currentPath = useRef<SkPath | null>(null);
  const canvasRef = useRef<any>(null);
  const [loading, setLoading] = useState(false);

  const coupleId = route.params?.coupleId;

  const onTouch = useTouchHandler({
    onStart: (pt) => {
      currentPath.current = Skia.Path.Make();
      currentPath.current.moveTo(pt.x, pt.y);
    },
    onActive: (pt) => {
      if (currentPath.current) {
        currentPath.current.lineTo(pt.x, pt.y);
        // Force refresh
        setPaths([...paths]); 
      }
    },
    onEnd: () => {
      if (currentPath.current) {
        setPaths([...paths, { path: currentPath.current, color: '#FF6B6B' }]);
        currentPath.current = null;
      }
    },
  });

  const handleClear = () => setPaths([]);

  const handleSend = async () => {
    if (paths.length === 0) {
      Alert.alert('Empty Canvas', 'Draw something sweet first!');
      return;
    }
    if (!coupleId) {
      Alert.alert('Error', 'No couple connection found.');
      return;
    }

    setLoading(true);
    try {
      // 1. Capture Canvas as Base64 Image using Skia
      const surface = Skia.Surface.Make(CANVAS_SIZE, CANVAS_SIZE);
      if (!surface) throw new Error('Surface creation failed');
      
      const canvas = surface.getCanvas();
      canvas.clear(Skia.Color('#FFFFFF'));
      const paint = Skia.Paint();
      paint.setStyle(Skia.PaintStyle.Stroke);
      paint.setStrokeWidth(5);
      paint.setColor(Skia.Color('#FF6B6B'));
      paint.setStrokeJoin(Skia.StrokeJoin.Round);
      paint.setStrokeCap(Skia.StrokeCap.Round);

      paths.forEach(p => {
        canvas.drawPath(p.path, paint);
      });

      const image = surface.makeImageSnapshot();
      const dataUrl = image.encodeToBaseDataUrl(ImageFormat.PNG, 100);
      
      if (!dataUrl) throw new Error('Failed to encode image');

      // Strip "data:image/png;base64," prefix
      const base64 = dataUrl.split(',')[1];

      // 2. Save locally for the Widget
      const localUri = `${FileSystem.cacheDirectory}latest_doodle.png`;
      await FileSystem.writeAsStringAsync(localUri, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // 3. Upload to Firebase for partner (Storage needs bytes or base64)
      const storageRef = ref(storage, `doodles/${coupleId}/latest.png`);
      // Use uploadString for base64
      const { uploadString } = await import('firebase/storage');
      await uploadString(storageRef, base64, 'base64');
      const downloadURL = await getDownloadURL(storageRef);

      // 4. Update Firestore
      await updateDoc(doc(db, 'couples', coupleId), {
        latestDoodle: downloadURL,
        lastDoodleBy: auth.currentUser?.uid,
        updatedAt: new Date()
      });

      // 5. Update local native widget
      updateWidget(localUri);

      Alert.alert('Success!', 'Doodle sent to your partner!');
      navigation.goBack();
    } catch (e: any) {
      console.error(e);
      Alert.alert('Upload Failed', e.message);
    }
    setLoading(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Draw a Sweet Note</Text>
      
      <View style={styles.canvasContainer}>
        <Canvas style={{ width: CANVAS_SIZE, height: CANVAS_SIZE }} onTouch={onTouch}>
          {paths.map((p, i) => (
            <Path
              key={i}
              path={p.path}
              color={p.color}
              style="stroke"
              strokeWidth={5}
              strokeJoin="round"
              strokeCap="round"
            />
          ))}
          {currentPath.current && (
             <Path
               path={currentPath.current}
               color="#FF6B6B"
               style="stroke"
               strokeWidth={5}
               strokeJoin="round"
               strokeCap="round"
             />
          )}
        </Canvas>
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.clearButton} onPress={handleClear}>
          <Text style={styles.buttonText}>Clear</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.sendButton, loading && { opacity: 0.5 }]} 
          onPress={handleSend}
          disabled={loading}
        >
          <Text style={styles.buttonText}>{loading ? 'Sending...' : 'Send to Partner'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF0F5', alignItems: 'center', paddingTop: 60 },
  header: { fontSize: 24, fontWeight: 'bold', color: '#FF6B6B', marginBottom: 20 },
  canvasContainer: {
    width: CANVAS_SIZE,
    height: CANVAS_SIZE,
    backgroundColor: '#FFF',
    borderRadius: 15,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  buttonRow: { flexDirection: 'row', marginTop: 30, width: CANVAS_SIZE, justifyContent: 'space-between' },
  clearButton: { backgroundColor: '#A9A9A9', padding: 15, borderRadius: 10, flex: 0.45, alignItems: 'center' },
  sendButton: { backgroundColor: '#FF6B6B', padding: 15, borderRadius: 10, flex: 0.45, alignItems: 'center' },
  buttonText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 }
});
