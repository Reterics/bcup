import { initializeApp, FirebaseApp, deleteApp, getApps } from 'firebase/app'
import { getFirestore, collection, getDocs, doc, setDoc, Firestore } from 'firebase/firestore'

export interface FirebaseConfig {
  apiKey: string
  authDomain: string
  projectId: string
  storageBucket: string
  messagingSenderId: string
  appId: string
}

let currentApp: FirebaseApp | null = null
let currentDb: Firestore | null = null

export function initFirebase(config: FirebaseConfig): Firestore {
  // Clean up existing app if any
  if (currentApp) {
    const existing = getApps().find(a => a.name === currentApp!.name)
    if (existing) {
      deleteApp(existing)
    }
  }

  currentApp = initializeApp(config, 'bcup-' + config.projectId)
  currentDb = getFirestore(currentApp)
  return currentDb
}

export function getDb(): Firestore {
  if (!currentDb) {
    throw new Error('Firebase not initialized. Select a project first.')
  }
  return currentDb
}

export async function getDocuments(collectionName: string): Promise<Array<Record<string, unknown>>> {
  const db = getDb()
  const snapshot = await getDocs(collection(db, collectionName))
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }))
}

export async function setDocument(collectionName: string, docId: string, data: Record<string, unknown>): Promise<void> {
  const db = getDb()
  const { id: _, ...fields } = data
  await setDoc(doc(db, collectionName, docId), fields)
}
