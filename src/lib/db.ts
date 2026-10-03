import { 
  ref,
  get,
  set,
  update,
  push,
  remove,
  child,
  query,
  orderByChild,
  onValue,
  runTransaction
} from 'firebase/database';
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
  const storageRef = sRef(storage, path);
  try {
    await deleteObject(storageRef);
  } catch (err) {
    console.warn("Could not delete image at path:", path, err);
  }
};

// Products
export const getProducts = async (): Promise<Product[]> => {
  const dbRef = ref(db, 'products');
  const snapshot = await get(dbRef);
  if (snapshot.exists()) {
    const data = snapshot.val();
    return Object.keys(data).map(key => ({ id: key, ...data[key] }));
  }
  return [];
};

export const addProduct = async (product: Omit<Product, 'id'>) => {
  const dbRef = ref(db, 'products');
  const newRef = push(dbRef);
  await set(newRef, product);
  return newRef.key!;
};

export const updateProduct = async (id: string, data: Partial<Product>) => {
  const dbRef = ref(db, `products/${id}`);
  await update(dbRef, data);
};

export const deleteProduct = async (id: string) => {
  const dbRef = ref(db, `products/${id}`);
  await remove(dbRef);
};

// Loyalty Tiers
export const getLoyaltyTiers = async (): Promise<LoyaltyTier[]> => {
  const dbRef = ref(db, 'loyaltyTiers');
  const snapshot = await get(dbRef);
  if (snapshot.exists()) {
    const data = snapshot.val();
    return Object.keys(data).map(key => ({ id: key, ...data[key] }));
  }
  return [];
};

export const updateLoyaltyTier = async (id: string, data: Partial<LoyaltyTier>) => {
  const dbRef = ref(db, `loyaltyTiers/${id}`);
  await update(dbRef, data);
};

// Orders
export const saveOrder = async (order: Omit<Order, 'id'>): Promise<string> => {
  try {
    const ordersRef = ref(db, 'orders');
    const newOrderRef = push(ordersRef);
    const orderId = newOrderRef.key!;
    
    const orderToSave = {
      ...order,
      id: orderId,
      status: order.status || 'new',
      timestamp: Date.now()
    };

    await set(ref(db, `orders/${orderId}`), orderToSave);

    // Update stock
    for (const item of order.items) {
      try {
        const productStockRef = ref(db, `products/${item.id}/stock`);
        await runTransaction(productStockRef, (currentStock) => {
          if (currentStock === null) return 0;
          return Math.max(0, currentStock - item.quantity);
        });
      } catch (stockErr) {
        console.warn(`Could not update stock for product ${item.id}:`, stockErr);
      }
    }

    return orderId;
  } catch (err) {
    handleDatabaseError(err, OperationType.CREATE, 'orders');
    return '';
  }
};

export const updateUserPoints = async (userId: string, pointsToAdd: number) => {
  const userPointsRef = ref(db, `users/${userId}/points`);
  await runTransaction(userPointsRef, (currentPoints) => {
    return (currentPoints || 0) + pointsToAdd;
  });
};

export const updateOrder = async (id: string, data: Partial<Order>) => {
  const dbRef = ref(db, `orders/${id}`);
  await update(dbRef, data);
};

export const deleteOrder = async (id: string) => {
  const dbRef = ref(db, `orders/${id}`);
  await remove(dbRef);
};

export const addFeedback = async (feedback: Omit<Feedback, 'id'>) => {
  const dbRef = ref(db, 'feedbacks');
  const newRef = push(dbRef);
  await set(newRef, feedback);
  return newRef.key!;
};

export const getFeedbacks = async (): Promise<Feedback[]> => {
  const dbRef = ref(db, 'feedbacks');
  const snapshot = await get(dbRef);
  if (snapshot.exists()) {
    const data = snapshot.val();
    return Object.keys(data).map(key => ({ id: key, ...data[key] })).sort((a, b) => b.timestamp - a.timestamp);
  }
  return [];
};

export const getOrders = async (): Promise<Order[]> => {
  const dbRef = ref(db, 'orders');
  const snapshot = await get(dbRef);
  if (snapshot.exists()) {
    const data = snapshot.val();
    return Object.keys(data).map(key => ({ id: key, ...data[key] })).sort((a, b) => b.timestamp - a.timestamp);
  }
  return [];
};

// Coupons
export const getCoupons = async (): Promise<Coupon[]> => {
  const dbRef = ref(db, 'coupons');
  const snapshot = await get(dbRef);
  if (snapshot.exists()) {
    const data = snapshot.val();
    return Object.keys(data).map(key => ({ id: key, ...data[key] }));
  }
  return [];
};

export const addCoupon = async (coupon: Omit<Coupon, 'id'>) => {
  const dbRef = ref(db, 'coupons');
  const newRef = push(dbRef);
  await set(newRef, coupon);
  return newRef.key!;
};

export const updateCoupon = async (id: string, data: Partial<Coupon>) => {
  const dbRef = ref(db, `coupons/${id}`);
  await update(dbRef, data);
};

export const deleteCoupon = async (id: string) => {
  const dbRef = ref(db, `coupons/${id}`);
  await remove(dbRef);
};

// Delivery Areas
export const getDeliveryAreas = async (): Promise<DeliveryArea[]> => {
  const dbRef = ref(db, 'deliveryAreas');
  const snapshot = await get(dbRef);
  if (snapshot.exists()) {
    const data = snapshot.val();
    return Object.keys(data).map(key => ({ id: key, ...data[key] }));
  }
  return [];
};

export const addDeliveryArea = async (area: Omit<DeliveryArea, 'id'>) => {
  const dbRef = ref(db, 'deliveryAreas');
  const newRef = push(dbRef);
  await set(newRef, area);
  return newRef.key!;
};

export const updateDeliveryArea = async (id: string, data: Partial<DeliveryArea>) => {
  const dbRef = ref(db, `deliveryAreas/${id}`);
  await update(dbRef, data);
};

export const deleteDeliveryArea = async (id: string) => {
  const dbRef = ref(db, `deliveryAreas/${id}`);
  await remove(dbRef);
};

// Store Config
export const getStoreConfig = async (): Promise<StoreConfig | null> => {
  try {
    const dbRef = ref(db, 'config/settings');
    const snapshot = await get(dbRef);
    if (snapshot.exists()) {
      return { id: 'settings', ...snapshot.val() } as StoreConfig;
    }
    return null;
  } catch (error) {
    handleDatabaseError(error, OperationType.GET, 'config/settings');
    return null;
  }
};

export const updateStoreConfig = async (data: Partial<StoreConfig>) => {
  const dbRef = ref(db, 'config/settings');
  await update(dbRef, data);
};

// Initialization helper
export const initializeDataIfEmpty = async (initialProducts: Product[], initialTiers: LoyaltyTier[]) => {
  try {
    const productsRef = ref(db, 'products');
    const productsSnapshot = await get(productsRef);
    if (!productsSnapshot.exists()) {
      for (const product of initialProducts) {
        const { id, ...p } = product;
        await set(ref(db, `products/${id}`), p);
      }
    }

    const tiersRef = ref(db, 'loyaltyTiers');
    const tiersSnapshot = await get(tiersRef);
    if (!tiersSnapshot.exists()) {
      for (const tier of initialTiers) {
        const { id, ...t } = tier;
        await set(ref(db, `loyaltyTiers/${id}`), t);
      }
    }

    const configRef = ref(db, 'config/settings');
    const configSnapshot = await get(configRef);
    if (!configSnapshot.exists()) {
      await set(configRef, INITIAL_CONFIG);
    }
  } catch (error) {
    console.error('Initialization seed failed (non-fatal):', error);
    // Don't throw here to avoid blocking UI rendering
  }
};

// Compatibility export for handleFirestoreError if needed by other files temporarily
export const handleFirestoreError = handleDatabaseError;
