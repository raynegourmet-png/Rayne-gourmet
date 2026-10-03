import { 
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  addDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  runTransaction,
  increment,
  Timestamp,
  doc as firestoreDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db, storage, auth } from './firebase';
import { ref as sRef, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { Product, Order, LoyaltyTier, Coupon, DeliveryArea, StoreConfig, Feedback } from '../types';
import { INITIAL_CONFIG } from '../data';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface DatabaseErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
  }
}

export function handleDatabaseError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: DatabaseErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
    },
    operationType,
    path
  }
  console.error('Database Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Storage
export const uploadImage = async (file: File, path: string): Promise<{ url: string, path: string }> => {
  try {
    const storageRef = sRef(storage, path);
    const snapshot = await uploadBytes(storageRef, file);
    const url = await getDownloadURL(snapshot.ref);
    return { url, path };
  } catch (error) {
    console.error("Firebase Storage upload failed, falling back to Base64:", error);
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        resolve({ url: reader.result as string, path: 'base64' });
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
};

export const deleteImage = async (path: string) => {
  if (path === 'base64') return;
  const storageRef = sRef(storage, path);
  try {
    await deleteObject(storageRef);
  } catch (err) {
    console.warn("Could not delete image at path:", path, err);
  }
};

// Products
export const getProducts = async (): Promise<Product[]> => {
  try {
    const colRef = collection(db, 'products');
    const snapshot = await getDocs(colRef);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
  } catch (err) {
    handleDatabaseError(err, OperationType.LIST, 'products');
    return [];
  }
};

export const addProduct = async (product: Omit<Product, 'id'>) => {
  try {
    const colRef = collection(db, 'products');
    const docRef = await addDoc(colRef, product);
    return docRef.id;
  } catch (err) {
    handleDatabaseError(err, OperationType.CREATE, 'products');
    return '';
  }
};

export const updateProduct = async (id: string, data: Partial<Product>) => {
  try {
    const docRef = doc(db, 'products', id);
    await updateDoc(docRef, data);
  } catch (err) {
    handleDatabaseError(err, OperationType.UPDATE, `products/${id}`);
  }
};

export const deleteProduct = async (id: string) => {
  try {
    const docRef = doc(db, 'products', id);
    await deleteDoc(docRef);
  } catch (err) {
    handleDatabaseError(err, OperationType.DELETE, `products/${id}`);
  }
};

// Loyalty Tiers
export const getLoyaltyTiers = async (): Promise<LoyaltyTier[]> => {
  try {
    const colRef = collection(db, 'loyaltyTiers');
    const snapshot = await getDocs(colRef);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LoyaltyTier));
  } catch (err) {
    handleDatabaseError(err, OperationType.LIST, 'loyaltyTiers');
    return [];
  }
};

export const updateLoyaltyTier = async (id: string, data: Partial<LoyaltyTier>) => {
  try {
    const docRef = doc(db, 'loyaltyTiers', id);
    await updateDoc(docRef, data);
  } catch (err) {
    handleDatabaseError(err, OperationType.UPDATE, `loyaltyTiers/${id}`);
  }
};

// Orders
export const saveOrder = async (order: Omit<Order, 'id'>): Promise<string> => {
  try {
    const colRef = collection(db, 'orders');
    
    // Convert undefined changeAmount to null for Firestore compatibility if needed, 
    // though Firestore handles missing fields fine.
    const cleanOrder = JSON.parse(JSON.stringify(order));
    
    const orderToSave = {
      ...cleanOrder,
      status: order.status || 'new',
      timestamp: Date.now()
    };

    const docRef = await addDoc(colRef, orderToSave);

    // Update stock in transaction
    await runTransaction(db, async (transaction) => {
      for (const item of order.items) {
        const productRef = doc(db, 'products', item.id);
        const productDoc = await transaction.get(productRef);
        if (productDoc.exists()) {
          const currentStock = productDoc.data().stock || 0;
          transaction.update(productRef, {
            stock: Math.max(0, currentStock - item.quantity)
          });
        }
      }
    });

    return docRef.id;
  } catch (err) {
    handleDatabaseError(err, OperationType.CREATE, 'orders');
    return '';
  }
};

export const updateUserPoints = async (userId: string, pointsToAdd: number) => {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
      await updateDoc(userRef, {
        points: increment(pointsToAdd)
      });
    } else {
      await setDoc(userRef, {
        points: pointsToAdd,
        updatedAt: serverTimestamp()
      });
    }
  } catch (err) {
    handleDatabaseError(err, OperationType.UPDATE, `users/${userId}/points`);
  }
};

export const updateOrder = async (id: string, data: Partial<Order>) => {
  try {
    const docRef = doc(db, 'orders', id);
    await updateDoc(docRef, data);
  } catch (err) {
    handleDatabaseError(err, OperationType.UPDATE, `orders/${id}`);
  }
};

export const deleteOrder = async (id: string) => {
  try {
    const docRef = doc(db, 'orders', id);
    await deleteDoc(docRef);
  } catch (err) {
    handleDatabaseError(err, OperationType.DELETE, `orders/${id}`);
  }
};

export const addFeedback = async (feedback: Omit<Feedback, 'id'>) => {
  try {
    const colRef = collection(db, 'feedbacks');
    const docRef = await addDoc(colRef, feedback);
    return docRef.id;
  } catch (err) {
    handleDatabaseError(err, OperationType.CREATE, 'feedbacks');
    return '';
  }
};

export const getFeedbacks = async (): Promise<Feedback[]> => {
  try {
    const colRef = collection(db, 'feedbacks');
    const q = query(colRef, orderBy('timestamp', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Feedback));
  } catch (err) {
    handleDatabaseError(err, OperationType.LIST, 'feedbacks');
    return [];
  }
};

export const getOrders = async (): Promise<Order[]> => {
  try {
    const colRef = collection(db, 'orders');
    const q = query(colRef, orderBy('timestamp', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
  } catch (err) {
    handleDatabaseError(err, OperationType.LIST, 'orders');
    return [];
  }
};

// Coupons
export const getCoupons = async (): Promise<Coupon[]> => {
  try {
    const colRef = collection(db, 'coupons');
    const snapshot = await getDocs(colRef);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Coupon));
  } catch (err) {
    handleDatabaseError(err, OperationType.LIST, 'coupons');
    return [];
  }
};

export const addCoupon = async (coupon: Omit<Coupon, 'id'>) => {
  try {
    const colRef = collection(db, 'coupons');
    const docRef = await addDoc(colRef, coupon);
    return docRef.id;
  } catch (err) {
    handleDatabaseError(err, OperationType.CREATE, 'coupons');
    return '';
  }
};

export const updateCoupon = async (id: string, data: Partial<Coupon>) => {
  try {
    const docRef = doc(db, 'coupons', id);
    await updateDoc(docRef, data);
  } catch (err) {
    handleDatabaseError(err, OperationType.UPDATE, `coupons/${id}`);
  }
};

export const deleteCoupon = async (id: string) => {
  try {
    const docRef = doc(db, 'coupons', id);
    await deleteDoc(docRef);
  } catch (err) {
    handleDatabaseError(err, OperationType.DELETE, `coupons/${id}`);
  }
};

// Delivery Areas
export const getDeliveryAreas = async (): Promise<DeliveryArea[]> => {
  try {
    const colRef = collection(db, 'deliveryAreas');
    const snapshot = await getDocs(colRef);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DeliveryArea));
  } catch (err) {
    handleDatabaseError(err, OperationType.LIST, 'deliveryAreas');
    return [];
  }
};

export const addDeliveryArea = async (area: Omit<DeliveryArea, 'id'>) => {
  try {
    const colRef = collection(db, 'deliveryAreas');
    const docRef = await addDoc(colRef, area);
    return docRef.id;
  } catch (err) {
    handleDatabaseError(err, OperationType.CREATE, 'deliveryAreas');
    return '';
  }
};

export const updateDeliveryArea = async (id: string, data: Partial<DeliveryArea>) => {
  try {
    const docRef = doc(db, 'deliveryAreas', id);
    await updateDoc(docRef, data);
  } catch (err) {
    handleDatabaseError(err, OperationType.UPDATE, `deliveryAreas/${id}`);
  }
};

export const deleteDeliveryArea = async (id: string) => {
  try {
    const docRef = doc(db, 'deliveryAreas', id);
    await deleteDoc(docRef);
  } catch (err) {
    handleDatabaseError(err, OperationType.DELETE, `deliveryAreas/${id}`);
  }
};

// Store Config
export const getStoreConfig = async (): Promise<StoreConfig | null> => {
  try {
    const docRef = doc(db, 'config', 'settings');
    const snapshot = await getDoc(docRef);
    if (snapshot.exists()) {
      return { id: 'settings', ...snapshot.data() } as StoreConfig;
    }
    return null;
  } catch (error) {
    handleDatabaseError(error, OperationType.GET, 'config/settings');
    return null;
  }
};

export const updateStoreConfig = async (data: Partial<StoreConfig>) => {
  try {
    const docRef = doc(db, 'config', 'settings');
    await setDoc(docRef, data, { merge: true });
  } catch (err) {
    handleDatabaseError(err, OperationType.UPDATE, 'config/settings');
  }
};

// Initialization helper
export const initializeDataIfEmpty = async (initialProducts: Product[], initialTiers: LoyaltyTier[]) => {
  try {
    // Check if initialized
    const configRef = doc(db, 'config', 'settings');
    const configSnapshot = await getDoc(configRef);
    
    if (!configSnapshot.exists()) {
      console.log('Initializing Firestore data...');
      
      // Seed Config
      await setDoc(configRef, INITIAL_CONFIG);
      
      // Seed Products
      const prodCol = collection(db, 'products');
      for (const product of initialProducts) {
        const { id, ...p } = product;
        await setDoc(doc(prodCol, id), p);
      }
      
      // Seed Tiers
      const tiersCol = collection(db, 'loyaltyTiers');
      for (const tier of initialTiers) {
        const { id, ...t } = tier;
        await setDoc(doc(tiersCol, id), t);
      }
      
      console.log('Firestore initialization complete.');
    }
  } catch (error) {
    console.error('Initialization seed failed (non-fatal):', error);
  }
};

export const handleFirestoreError = handleDatabaseError;
