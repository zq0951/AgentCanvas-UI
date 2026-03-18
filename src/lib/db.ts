import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface NexusDB extends DBSchema {
  sessions: {
    key: string;
    value: {
      id: string;
      title: string;
      createdAt: number;
      updatedAt: number;
      nodes: any[];
      edges: any[];
    };
    indexes: { 'by-date': number };
  };
}

let dbPromise: Promise<IDBPDatabase<NexusDB>> | null = null;

export const getDB = () => {
  if (typeof window === 'undefined') return null;
  
  if (!dbPromise) {
    dbPromise = openDB<NexusDB>('nexus-board-db', 1, {
      upgrade(db) {
        const sessionStore = db.createObjectStore('sessions', {
          keyPath: 'id',
        });
        sessionStore.createIndex('by-date', 'updatedAt');
      },
    });
  }
  return dbPromise;
};

export const saveSession = async (session: NexusDB['sessions']['value']) => {
  const db = await getDB();
  if (!db) return;
  await db.put('sessions', session);
};

export const getSessions = async () => {
  const db = await getDB();
  if (!db) return [];
  return db.getAllFromIndex('sessions', 'by-date');
};

export const getSession = async (id: string) => {
  const db = await getDB();
  if (!db) return null;
  return db.get('sessions', id);
};
