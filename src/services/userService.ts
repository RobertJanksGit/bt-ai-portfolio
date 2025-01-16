import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../config/firebase";
import { User, UserRole } from "../types/user";
import { uploadProfilePhoto } from "./storageService";
import { getFunctions, httpsCallable } from "firebase/functions";

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

  // Update custom claims through Cloud Function
  const functions = getFunctions();
  const setCustomClaims = httpsCallable(functions, "setUserRole");
  await setCustomClaims({ uid, role: newRole });
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

export const updateProfile = async (
  uid: string,
  updates: {
    name?: string;
    photoURL?: File;
  }
): Promise<void> => {
  const userRef = doc(db, "users", uid);
  const updateData: { [key: string]: any } = {};

  if (updates.name) {
    updateData.name = updates.name;
  }

  if (updates.photoURL) {
    const photoURL = await uploadProfilePhoto(uid, updates.photoURL);
    updateData.photoURL = photoURL;
  }

  if (Object.keys(updateData).length > 0) {
    await updateDoc(userRef, updateData);
  }
};
