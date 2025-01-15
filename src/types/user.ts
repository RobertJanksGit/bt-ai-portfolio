export type UserRole = "user" | "admin";

export interface User {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: Date;
  lastLogin: Date;
  photoURL?: string;
  isActive: boolean;
}
