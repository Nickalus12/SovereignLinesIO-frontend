import { promises as fs } from 'fs';
import * as path from 'path';

export interface StoredFlag {
  id: string;
  userId: string;
  svg: string;
  name: string;
  metadata: {
    style?: string;
    complexity?: number;
    colorScheme?: string;
    primaryColor?: string;
  };
  createdAt: Date;
  public: boolean;
}

export class FlagStorage {
  private storageDir: string;
  private flagsCache: Map<string, StoredFlag[]> = new Map();

  constructor(storageDir: string = './data/flags') {
    this.storageDir = storageDir;
    this.initStorage();
  }

  private async initStorage() {
    try {
      await fs.mkdir(this.storageDir, { recursive: true });
      await this.loadAllFlags();
    } catch (error) {
      console.error('Failed to initialize flag storage:', error);
    }
  }

  private async loadAllFlags() {
    try {
      const files = await fs.readdir(this.storageDir);
      for (const file of files) {
        if (file.endsWith('.json')) {
          const userId = file.replace('.json', '');
          const data = await fs.readFile(path.join(this.storageDir, file), 'utf-8');
          this.flagsCache.set(userId, JSON.parse(data));
        }
      }
    } catch (error) {
      console.error('Failed to load flags:', error);
    }
  }

  async saveFlag(userId: string, flag: Omit<StoredFlag, 'userId'>): Promise<StoredFlag> {
    const userFlags = this.flagsCache.get(userId) || [];
    const newFlag: StoredFlag = {
      ...flag,
      userId,
      createdAt: new Date()
    };
    
    userFlags.push(newFlag);
    this.flagsCache.set(userId, userFlags);
    
    // Save to disk
    await this.saveUserFlags(userId);
    
    return newFlag;
  }

  async getUserFlags(userId: string): Promise<StoredFlag[]> {
    return this.flagsCache.get(userId) || [];
  }

  async getFlag(flagId: string): Promise<StoredFlag | null> {
    for (const [userId, flags] of this.flagsCache.entries()) {
      const flag = flags.find(f => f.id === flagId);
      if (flag) return flag;
    }
    return null;
  }

  async deleteFlag(userId: string, flagId: string): Promise<boolean> {
    const userFlags = this.flagsCache.get(userId) || [];
    const filteredFlags = userFlags.filter(f => f.id !== flagId);
    
    if (filteredFlags.length < userFlags.length) {
      this.flagsCache.set(userId, filteredFlags);
      await this.saveUserFlags(userId);
      return true;
    }
    
    return false;
  }

  async getPublicFlags(limit: number = 50): Promise<StoredFlag[]> {
    const publicFlags: StoredFlag[] = [];
    
    for (const flags of this.flagsCache.values()) {
      publicFlags.push(...flags.filter(f => f.public));
      if (publicFlags.length >= limit) break;
    }
    
    return publicFlags.slice(0, limit);
  }

  private async saveUserFlags(userId: string) {
    const flags = this.flagsCache.get(userId) || [];
    const filePath = path.join(this.storageDir, `${userId}.json`);
    await fs.writeFile(filePath, JSON.stringify(flags, null, 2));
  }

  // Get generation count for today
  async getTodayGenerationCount(userId: string): Promise<number> {
    const flags = await this.getUserFlags(userId);
    const today = new Date().toDateString();
    
    return flags.filter(f => 
      new Date(f.createdAt).toDateString() === today
    ).length;
  }
}

// Singleton instance
export const flagStorage = new FlagStorage();