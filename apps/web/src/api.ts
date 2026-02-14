import axios from "axios";

const api = axios.create({ baseURL: "/api/v1" });

api.interceptors.request.use((cfg) => {
  const token = localStorage.getItem("shrampi_token");
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (error.response?.status === 401) {
      const refreshToken = localStorage.getItem("shrampi_refresh");
      if (refreshToken && !error.config._retry) {
        error.config._retry = true;
        try {
          const { data } = await axios.post("/api/v1/auth/refresh", {
            refreshToken,
          });
          localStorage.setItem("shrampi_token", data.data.accessToken);
          error.config.headers.Authorization = `Bearer ${data.data.accessToken}`;
          return axios(error.config);
        } catch {
          localStorage.removeItem("shrampi_token");
          localStorage.removeItem("shrampi_refresh");
          window.location.href = "/login";
        }
      }
    }
    return Promise.reject(error);
  },
);

export default api;
