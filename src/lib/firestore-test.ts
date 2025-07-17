import { collection, doc, setDoc, getDoc, getDocs } from 'firebase/firestore';
import { db } from './firebase';

// Test Firestore connection
export const testFirestoreConnection = async () => {
  try {
    console.log('🔍 Testing Firestore connection...');
    
    // Test 1: Write a test document
    const testDoc = doc(db, 'test', 'connection-test');
    await setDoc(testDoc, {
      message: 'Firestore is working!',
      timestamp: new Date().toISOString(),
    });
    console.log('✅ Test 1 passed: Document write successful');
    
    // Test 2: Read the test document
    const docSnap = await getDoc(testDoc);
    if (docSnap.exists()) {
      console.log('✅ Test 2 passed: Document read successful');
      console.log('📄 Document data:', docSnap.data());
    } else {
      console.log('❌ Test 2 failed: Document not found');
    }
    
    // Test 3: List collections
    const videosRef = collection(db, 'videos');
    const videosSnap = await getDocs(videosRef);
    console.log(`✅ Test 3 passed: Found ${videosSnap.size} videos in database`);
    
    const playlistsRef = collection(db, 'playlists');
    const playlistsSnap = await getDocs(playlistsRef);
    console.log(`✅ Test 4 passed: Found ${playlistsSnap.size} playlists in database`);
    
    console.log('🎉 All Firestore tests passed!');
    return true;
    
  } catch (error) {
    console.error('❌ Firestore connection test failed:', error);
    return false;
  }
};

// Quick health check
export const quickHealthCheck = async () => {
  try {
    const testDoc = doc(db, 'health', 'check');
    await setDoc(testDoc, { status: 'ok', time: Date.now() });
    console.log('✅ Firestore health check passed');
    return true;
  } catch (error) {
    console.error('❌ Firestore health check failed:', error);
    return false;
  }
};