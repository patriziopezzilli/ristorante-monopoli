// Migration script to move existing content to Firestore
import { httpsCallable } from 'firebase/functions';
import { functions } from '../src/firebase';

export const migrateContent = async () => {
  try {
    const migrateContentFn = httpsCallable(functions, 'migrateContent');
    const result = await migrateContentFn({});
    console.log('Migration result:', result.data);
    return result.data;
  } catch (error) {
    console.error('Migration error:', error);
    throw error;
  }
};

// Call migration if this script is run directly
if (typeof window !== 'undefined') {
  // Browser environment
  migrateContent().then(() => {
    console.log('Content migration completed');
  }).catch(console.error);
}