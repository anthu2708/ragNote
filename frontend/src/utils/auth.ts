import axios from './axios';

export type User = {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  created_at: string;
};

export async function register(name: string, email: string, password: string) {
  const res = await axios.post('/auth/register', { name, email, password });
  return res.data;
}

export async function login(email: string, password: string) {
  const res = await axios.post('/auth/login', { email, password });
  return res.data;
}

export async function logout() {
  const res = await axios.post('/auth/logout');
  return res.data;
}


export const fetchCurrentUser = async (): Promise<User> => {
  const res = await axios.get<User>('/auth/me');
  return res.data;
};
export async function checkAuth(): Promise<boolean> {
  try {
    await fetchCurrentUser();
    return true;
  } catch {
    return false;
  }
}
