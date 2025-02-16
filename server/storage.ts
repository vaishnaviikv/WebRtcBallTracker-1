import { users, type User, type InsertUser } from "@shared/schema";
import { BallConfigType, BallCoordinatesType, ErrorMetricsType } from "@shared/schema";

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getError(timestamp: number): Promise<ErrorMetricsType | undefined>;
  addError(error: ErrorMetricsType): Promise<void>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private errors: Map<number, ErrorMetricsType>;
  currentId: number;

  constructor() {
    this.users = new Map();
    this.errors = new Map();
    this.currentId = 1;
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }
  async getError(timestamp: number): Promise<ErrorMetricsType | undefined> {
    return this.errors.get(timestamp);
  }

  async addError(error: ErrorMetricsType): Promise<void> {
    this.errors.set(error.timestamp, error);
  }
}

export const storage = new MemStorage();