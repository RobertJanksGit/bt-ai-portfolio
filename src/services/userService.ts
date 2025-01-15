import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../config/firebase";
import { User, UserRole } from "../types/user";

export const createUserDocument = async (
  uid: string,
  email: string,
  name: string,
  role: UserRole = "user"
): Promise<void> => {
  const userRef = doc(db, "users", uid);
  const newUser: Partial<User> = {
    uid,
    email,
    name,
    role,
    createdAt: serverTimestamp() as unknown as Date,
    lastLogin: serverTimestamp() as unknown as Date,
    isActive: true,
  };

  await setDoc(userRef, newUser);
};

export const getUserById = async (uid: string): Promise<User | null> => {
  const userRef = doc(db, "users", uid);
  const userSnap = await getDoc(userRef);

  if (userSnap.exists()) {
    return userSnap.data() as User;
  }
  return null;
};

export const updateUserRole = async (
  uid: string,
  newRole: UserRole
): Promise<void> => {
  const userRef = doc(db, "users", uid);
  await updateDoc(userRef, { role: newRole });
};

export const updateLastLogin = async (uid: string): Promise<void> => {
  const userRef = doc(db, "users", uid);
  await updateDoc(userRef, {
    lastLogin: serverTimestamp(),
  });
};

export const isUserAdmin = async (uid: string): Promise<boolean> => {
  const user = await getUserById(uid);
  return user?.role === "admin";
};
