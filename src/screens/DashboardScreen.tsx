import { Image } from 'expo-image';
import { updateWidget } from '../modules/WidgetModule';

export default function DashboardScreen({ navigation, route }: any) {
  const [coupleData, setCoupleData] = useState<any>(null);
  const [noteInput, setNoteInput] = useState('');
  const [coupleId, setCoupleId] = useState<string | null>(route.params?.coupleId || null);

  useEffect(() => {
    let unsubscribeUser: any;
    let unsubscribeCouple: any;

    const currentCoupleId = coupleId;

    if (auth.currentUser) {
      if (!currentCoupleId) {
        unsubscribeUser = onSnapshot(doc(db, 'users', auth.currentUser.uid), (docSnap) => {
          if (docSnap.exists() && docSnap.data().coupleId) {
            setCoupleId(docSnap.data().coupleId);
          }
        });
      }

      if (currentCoupleId) {
        unsubscribeCouple = onSnapshot(doc(db, 'couples', currentCoupleId), (cSnap) => {
          if (cSnap.exists()) {
            setCoupleData(cSnap.data());
          }
        });
      }
    }

    return () => {
      unsubscribeUser && unsubscribeUser();
      unsubscribeCouple && unsubscribeCouple();
    };
  }, [coupleId]);

  const getDaysTogether = () => {
    if (!coupleData?.startDate) return 0;
    const start = coupleData.startDate.toDate();
    const diff = new Date().getTime() - start.getTime();
    return Math.floor(diff / (1000 * 3600 * 24));
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Loverzz</Text>
      
      <View style={styles.card}>
        <Text style={styles.title}>Days Together</Text>
        <Text style={styles.hugeText}>{getDaysTogether()} ♥</Text>
      </View>

      <TouchableOpacity 
        style={styles.doodleCard} 
        onPress={() => navigation.navigate('Doodle', { coupleId })}
      >
        <Text style={styles.title}>Partner's Latest Doodle</Text>
        {coupleData?.latestDoodle ? (
          <Image 
            source={{ uri: coupleData.latestDoodle }} 
            style={styles.doodleImage}
            contentFit="contain"
          />
        ) : (
          <View style={styles.placeholderDoodle}>
            <Text style={styles.placeholderText}>No doodles yet. Tap to draw one!</Text>
          </View>
        )}
      </TouchableOpacity>

      <View style={styles.navRow}>
        <TouchableOpacity style={[styles.navBlock, { backgroundColor: '#FF6B6B' }]} onPress={() => navigation.navigate('Quiz')}>
          <Text style={styles.navText}>Daily Quiz</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.navBlock, { backgroundColor: '#8E2DE2' }]} onPress={() => navigation.navigate('Timeline')}>
          <Text style={styles.navText}>Memories</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#FFF0F5', paddingTop: 60 },
  header: { fontSize: 32, fontWeight: 'bold', color: '#FF6B6B', marginBottom: 20, textAlign: 'center' },
  card: { backgroundColor: '#FFF', padding: 20, borderRadius: 15, marginBottom: 20, elevation: 3, shadowColor: '#FF6B6B', shadowOpacity: 0.2, shadowRadius: 5 },
  doodleCard: { backgroundColor: '#FFF', padding: 15, borderRadius: 15, marginBottom: 20, elevation: 3, height: 280, alignItems: 'center' },
  title: { fontSize: 18, fontWeight: '600', color: '#333', marginBottom: 10 },
  hugeText: { fontSize: 40, fontWeight: 'bold', color: '#FF6B6B', textAlign: 'center' },
  doodleImage: { width: '100%', height: 200, backgroundColor: '#F8F8F8', borderRadius: 10 },
  placeholderDoodle: { width: '100%', height: 200, backgroundColor: '#FAFAFA', borderRadius: 10, justifyContent: 'center', alignItems: 'center', borderStyle: 'dashed', borderWidth: 1, borderColor: '#DDD' },
  placeholderText: { color: '#AAA', fontStyle: 'italic' },
  navRow: { flexDirection: 'row', justifyContent: 'space-between' },
  navBlock: { flex: 0.48, padding: 20, borderRadius: 15, alignItems: 'center' },
  navText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 }
});
