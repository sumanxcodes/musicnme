import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { Tag } from '@/types';

// Tag operations
export const createTag = async (tag: Omit<Tag, 'id'>): Promise<string> => {
  try {
    const tagRef = await addDoc(collection(db, 'tags'), {
      ...tag,
      createdAt: serverTimestamp(),
    });
    return tagRef.id;
  } catch (error) {
    console.error('Error creating tag:', error);
    throw error;
  }
};

export const getTag = async (tagId: string): Promise<Tag | null> => {
  try {
    const tagRef = doc(db, 'tags', tagId);
    const tagDoc = await getDoc(tagRef);
    
    if (tagDoc.exists()) {
      return {
        id: tagDoc.id,
        ...tagDoc.data(),
      } as Tag;
    }
    return null;
  } catch (error) {
    console.error('Error getting tag:', error);
    return null;
  }
};

export const getAllTags = async (): Promise<Tag[]> => {
  try {
    const tagsRef = collection(db, 'tags');
    const q = query(tagsRef, orderBy('name'));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as Tag[];
  } catch (error) {
    console.error('Error getting all tags:', error);
    return [];
  }
};

export const getTagsByCategory = async (category: Tag['category']): Promise<Tag[]> => {
  try {
    const tagsRef = collection(db, 'tags');
    const q = query(
      tagsRef,
      where('category', '==', category),
      orderBy('name')
    );
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as Tag[];
  } catch (error) {
    console.error('Error getting tags by category:', error);
    return [];
  }
};

export const searchTags = async (searchTerm: string): Promise<Tag[]> => {
  try {
    const tagsRef = collection(db, 'tags');
    const querySnapshot = await getDocs(tagsRef);
    
    // Client-side filtering since Firestore doesn't support case-insensitive search
    const allTags = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as Tag[];
    
    const searchLower = searchTerm.toLowerCase();
    return allTags.filter(tag => 
      tag.name.toLowerCase().includes(searchLower)
    );
  } catch (error) {
    console.error('Error searching tags:', error);
    return [];
  }
};

export const updateTag = async (tagId: string, updates: Partial<Tag>): Promise<void> => {
  try {
    const tagRef = doc(db, 'tags', tagId);
    await updateDoc(tagRef, updates);
  } catch (error) {
    console.error('Error updating tag:', error);
    throw error;
  }
};

export const deleteTag = async (tagId: string): Promise<void> => {
  try {
    const tagRef = doc(db, 'tags', tagId);
    await deleteDoc(tagRef);
  } catch (error) {
    console.error('Error deleting tag:', error);
    throw error;
  }
};

// Utility functions
export const getTagsByNames = async (tagNames: string[]): Promise<Tag[]> => {
  try {
    const tagsRef = collection(db, 'tags');
    const q = query(tagsRef, where('name', 'in', tagNames));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as Tag[];
  } catch (error) {
    console.error('Error getting tags by names:', error);
    return [];
  }
};

export const createTagsIfNotExist = async (tagNames: string[], category: Tag['category'], createdBy: string): Promise<Tag[]> => {
  try {
    const existingTags = await getTagsByNames(tagNames);
    const existingTagNames = existingTags.map(tag => tag.name);
    const newTagNames = tagNames.filter(name => !existingTagNames.includes(name));
    
    const newTags: Tag[] = [];
    
    for (const tagName of newTagNames) {
      const tagId = await createTag({
        name: tagName,
        category,
        createdBy,
      });
      
      newTags.push({
        id: tagId,
        name: tagName,
        category,
        createdBy,
      });
    }
    
    return [...existingTags, ...newTags];
  } catch (error) {
    console.error('Error creating tags if not exist:', error);
    return [];
  }
};

// Predefined tag suggestions
export const getTagSuggestions = (category: Tag['category']): string[] => {
  const suggestions: Record<Tag['category'], string[]> = {
    key: ['C Major', 'D Major', 'E Major', 'F Major', 'G Major', 'A Major', 'B Major', 'C Minor', 'D Minor', 'E Minor', 'F Minor', 'G Minor', 'A Minor', 'B Minor'],
    tempo: ['Slow', 'Medium', 'Fast', 'Very Fast', 'Adagio', 'Andante', 'Moderato', 'Allegro', 'Presto'],
    activity: ['Warm-up', 'Practice', 'Performance', 'Cool-down', 'Group Activity', 'Solo', 'Duet', 'Ensemble', 'Improvisation', 'Composition'],
    difficulty: ['Beginner', 'Easy', 'Intermediate', 'Advanced', 'Expert', 'Simple', 'Complex', 'Challenging'],
    custom: ['Fun', 'Relaxing', 'Energetic', 'Calming', 'Upbeat', 'Peaceful', 'Exciting', 'Therapeutic', 'Educational', 'Interactive'],
  };
  
  return suggestions[category] || [];
};

// Tag analytics
export const getTagUsageStats = async (): Promise<Record<string, number>> => {
  try {
    // This would require a more complex query to count tag usage across videos
    // For now, return empty stats
    return {};
  } catch (error) {
    console.error('Error getting tag usage stats:', error);
    return {};
  }
};

// Batch operations
export const batchCreateTags = async (tags: Omit<Tag, 'id'>[]): Promise<string[]> => {
  try {
    const tagIds: string[] = [];
    
    for (const tag of tags) {
      const tagId = await createTag(tag);
      tagIds.push(tagId);
    }
    
    return tagIds;
  } catch (error) {
    console.error('Error batch creating tags:', error);
    throw error;
  }
};

export const batchDeleteTags = async (tagIds: string[]): Promise<void> => {
  try {
    for (const tagId of tagIds) {
      await deleteTag(tagId);
    }
  } catch (error) {
    console.error('Error batch deleting tags:', error);
    throw error;
  }
};