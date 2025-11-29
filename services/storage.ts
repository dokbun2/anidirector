
import { Character, SavedProject, User } from '../types';

const KEYS = {
  USER: 'mv_director_user',
  CHARACTERS_LS: 'mv_director_characters', // Legacy Key for migration
  PROJECTS_LS: 'mv_director_projects'    // Legacy Key for migration
};

const DB_NAME = 'mv_director_db';
const DB_VERSION = 1;
const STORES = {
  CHARACTERS: 'characters',
  PROJECTS: 'projects'
};

// Helper to open IndexedDB
const getDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORES.CHARACTERS)) {
        db.createObjectStore(STORES.CHARACTERS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORES.PROJECTS)) {
        db.createObjectStore(STORES.PROJECTS, { keyPath: 'id' });
      }
    };
  });
};

export const storageService = {
  async getCurrentUser(): Promise<User | null> {
    const u = localStorage.getItem(KEYS.USER);
    return u ? JSON.parse(u) : null;
  },

  async login(user: User): Promise<User> {
    localStorage.setItem(KEYS.USER, JSON.stringify(user));
    return user;
  },

  logout() {
    localStorage.removeItem(KEYS.USER);
  },

  async getCharacters(): Promise<Character[]> {
    const db = await getDB();
    
    // 1. Try to get from IndexedDB
    const fromDB = await new Promise<Character[]>((resolve, reject) => {
      const tx = db.transaction(STORES.CHARACTERS, 'readonly');
      const store = tx.objectStore(STORES.CHARACTERS);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });

    if (fromDB.length > 0) return fromDB;

    // 2. If DB is empty, check localStorage for legacy data and migrate
    const lsChars = localStorage.getItem(KEYS.CHARACTERS_LS);
    if (lsChars) {
      try {
        const parsed: Character[] = JSON.parse(lsChars);
        if (parsed.length > 0) {
            // Save to IDB
            await this.saveCharacters(parsed);
            // Clear legacy
            localStorage.removeItem(KEYS.CHARACTERS_LS);
            return parsed;
        }
      } catch (e) {
        console.error("Migration error for characters", e);
      }
    }
    
    return [];
  },

  async saveCharacters(chars: Character[]) {
    const db = await getDB();
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORES.CHARACTERS, 'readwrite');
      const store = tx.objectStore(STORES.CHARACTERS);
      
      // Since we pass the full list from React state, we clear and re-add to ensure deletions are synced
      const clearReq = store.clear();
      
      clearReq.onsuccess = () => {
        if (chars.length === 0) return;
        chars.forEach(c => store.put(c));
      };

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },

  async getProjects(): Promise<SavedProject[]> {
    const db = await getDB();
    
    const fromDB = await new Promise<SavedProject[]>((resolve, reject) => {
      const tx = db.transaction(STORES.PROJECTS, 'readonly');
      const store = tx.objectStore(STORES.PROJECTS);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });

    if (fromDB.length > 0) return fromDB;

    // Migration
    const lsProjects = localStorage.getItem(KEYS.PROJECTS_LS);
    if (lsProjects) {
        try {
            const parsed: SavedProject[] = JSON.parse(lsProjects);
            if (parsed.length > 0) {
                // Bulk add to IDB
                const tx = db.transaction(STORES.PROJECTS, 'readwrite');
                const store = tx.objectStore(STORES.PROJECTS);
                parsed.forEach(p => store.put(p));
                
                await new Promise<void>((resolveTx) => {
                    tx.oncomplete = () => resolveTx();
                });
                
                localStorage.removeItem(KEYS.PROJECTS_LS);
                return parsed;
            }
        } catch (e) {
            console.error("Migration error for projects", e);
        }
    }

    return [];
  },

  async saveProject(project: SavedProject) {
    const db = await getDB();
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORES.PROJECTS, 'readwrite');
      const store = tx.objectStore(STORES.PROJECTS);
      store.put(project);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },

  async clearAllData() {
    const db = await getDB();

    // Clear characters
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORES.CHARACTERS, 'readwrite');
      const store = tx.objectStore(STORES.CHARACTERS);
      store.clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });

    // Clear projects
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORES.PROJECTS, 'readwrite');
      const store = tx.objectStore(STORES.PROJECTS);
      store.clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });

    // Clear legacy localStorage items
    localStorage.removeItem(KEYS.CHARACTERS_LS);
    localStorage.removeItem(KEYS.PROJECTS_LS);
  }
};
