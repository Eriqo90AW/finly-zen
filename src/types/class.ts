export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  user_id?: string;
  created_at?: string;
}

export interface Account {
  id: string;
  name: string;
  color: string;
  user_id?: string;
  created_at?: string;
  balance?: number;
}
