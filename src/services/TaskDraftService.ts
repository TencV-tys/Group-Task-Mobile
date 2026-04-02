// services/TaskDraftService.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TokenUtils } from '../utils/tokenUtils';

const DRAFTS_STORAGE_KEY = 'task_drafts';

export interface TaskDraft {
  id: string;
  groupId: string;
  groupName: string;
  title: string;
  description?: string;
  points: number;
  executionFrequency: 'DAILY' | 'WEEKLY';
  selectedDays?: string[];
  timeSlots: Array<{
    startTime: string;
    endTime: string;
    label?: string; 
    points?: number;
  }>;
  category?: string;
  isRecurring: boolean;
  createdAt: string;
  updatedAt: string;
}

export class TaskDraftService {
  
  // Save a task as draft
  static async saveDraft(
    groupId: string,
    groupName: string,
    data: Omit<TaskDraft, 'id' | 'groupId' | 'groupName' | 'createdAt' | 'updatedAt'>
  ): Promise<TaskDraft> {
    try {
      const user = await TokenUtils.getUser();
      if (!user) throw new Error('User not authenticated');

      const drafts = await this.getDrafts();
      
      const newDraft: TaskDraft = {
        id: `${user.id}_${Date.now()}`,
        groupId,
        groupName,
        ...data,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      drafts.push(newDraft);
      await AsyncStorage.setItem(DRAFTS_STORAGE_KEY, JSON.stringify(drafts));
      
      return newDraft;
    } catch (error) {
      console.error('Error saving draft:', error);
      throw error;
    }
  }
  
  // Get all drafts for current user
  static async getDrafts(): Promise<TaskDraft[]> {
    try {
      const user = await TokenUtils.getUser();
      if (!user) return [];
      
      const draftsJson = await AsyncStorage.getItem(DRAFTS_STORAGE_KEY);
      const allDrafts: TaskDraft[] = draftsJson ? JSON.parse(draftsJson) : [];
      
      // Filter drafts for current user only
      return allDrafts.filter(draft => draft.id.startsWith(user.id));
    } catch (error) {
      console.error('Error getting drafts:', error);
      return [];
    }
  }
  
  // Get drafts for a specific group
  static async getGroupDrafts(groupId: string): Promise<TaskDraft[]> {
    const drafts = await this.getDrafts();
    return drafts.filter(draft => draft.groupId === groupId);
  }
  
  // Get a single draft by ID
  static async getDraftById(draftId: string): Promise<TaskDraft | null> {
    const drafts = await this.getDrafts();
    return drafts.find(draft => draft.id === draftId) || null;
  }
  
  // Update a draft
  static async updateDraft(draftId: string, updates: Partial<Omit<TaskDraft, 'id' | 'createdAt'>>): Promise<TaskDraft | null> {
    try {
      const drafts = await this.getDrafts();
      const index = drafts.findIndex(draft => draft.id === draftId);
      
      if (index === -1) return null;
      
      drafts[index] = {
        ...drafts[index],
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      
      await AsyncStorage.setItem(DRAFTS_STORAGE_KEY, JSON.stringify(drafts));
      return drafts[index];
    } catch (error) {
      console.error('Error updating draft:', error);
      return null;
    }
  }
  
  // Delete a draft
  static async deleteDraft(draftId: string): Promise<boolean> {
    try {
      const drafts = await this.getDrafts();
      const filtered = drafts.filter(draft => draft.id !== draftId);
      await AsyncStorage.setItem(DRAFTS_STORAGE_KEY, JSON.stringify(filtered));
      return true;
    } catch (error) {
      console.error('Error deleting draft:', error);
      return false;
    }
  }
  
  // Clear all drafts for current user
  static async clearAllDrafts(): Promise<boolean> {
    try {
      await AsyncStorage.removeItem(DRAFTS_STORAGE_KEY);
      return true;
    } catch (error) {
      console.error('Error clearing drafts:', error);
      return false;
    }
  }
} 