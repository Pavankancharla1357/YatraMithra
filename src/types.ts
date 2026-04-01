/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface User {
  id: string;
  email: string;
  fullName: string;
  bio?: string;
  avatarUrl?: string;
  interests: string[];
  location?: string;
  createdAt: Date;
}

export interface Trip {
  id: string;
  organizerId: string;
  title: string;
  description?: string;
  destination: string;
  startDate: Date;
  endDate: Date;
  budgetRange: 'Budget' | 'Mid-range' | 'Luxury';
  maxMembers: number;
  status: 'planning' | 'active' | 'completed' | 'cancelled';
  inviteCode: string;
  createdAt: Date;
}

export interface TripMember {
  tripId: string;
  userId: string;
  role: 'organizer' | 'member';
  joinedAt: Date;
}

export interface Expense {
  id: string;
  tripId: string;
  payerId: string;
  amount: number;
  currency: string;
  description: string;
  category: string;
  expenseDate: Date;
  createdAt: Date;
}

export interface Review {
  id: string;
  reviewerId: string;
  revieweeId: string;
  tripId: string;
  rating: number;
  comment?: string;
  createdAt: Date;
}

export interface ChatMessage {
  id: string;
  channelId: string;
  senderId: string;
  content: string;
  attachments?: {
    url: string;
    type: 'image' | 'video' | 'file';
    name: string;
  }[];
  timestamp: Date;
  readBy: string[];
}
