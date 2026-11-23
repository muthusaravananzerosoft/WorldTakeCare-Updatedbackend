/** Travel posts + comments domain types. */

export interface PostRecord {
  id: number;
  userId: number;
  title: string;
  description: string;
  imageUrl: string | null;
  publishedDate: string;
  readingTimeMin: number;
  createdAt: string;
  updatedAt: string;
  /** Joined from `user` — may be null if the author row was removed. */
  authorFirstName: string | null;
  authorLastName: string | null;
  commentCount: number;
}

export interface CommentRecord {
  id: number;
  postId: number;
  userId: number;
  comment: string;
  createdAt: string;
  updatedAt: string;
  authorFirstName: string | null;
  authorLastName: string | null;
}

export interface CreatePostInput {
  title: string;
  description: string;
  imageUrl?: string;
  publishedDate: string;
}

export type UpdatePostInput = Partial<CreatePostInput>;

export interface PostResult {
  id: number;
  title: string;
  description: string;
  imageUrl: string | null;
  readingTimeMin: number;
  publishedDate: string;
  createdAt: string;
  updatedAt: string;
  author: { id: number; firstName: string | null; lastName: string | null };
  commentCount: number;
}

export interface CommentResult {
  id: number;
  postId: number;
  comment: string;
  createdAt: string;
  updatedAt: string;
  author: { id: number; firstName: string | null; lastName: string | null };
}
