import axios from 'axios';

export const api = axios.create({ baseURL: `${process.env.REACT_APP_BACKEND_URL}/api`, timeout: 30000 });
api.interceptors.request.use(config => {
  const token = localStorage.getItem('kingcom-session');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
export const errorMessage = error => typeof error?.response?.data?.detail === 'string'
  ? error.response.data.detail : Array.isArray(error?.response?.data?.detail)
    ? error.response.data.detail[0].msg.replace('Value error, ', '') : error?.message === 'Network Error'
    ? 'Connection interrupted. Please try again.' : 'Something went wrong. Please try again.';

export async function startSession() {
  if (localStorage.getItem('kingcom-session')) {
    try { return (await api.get('/players/me')).data; }
    catch (error) { if (error.response?.status !== 401) throw error; }
  }
  const { data } = await api.post('/players/guest');
  localStorage.setItem('kingcom-session', data.token);
  return data.player;
}