const baseURL = process.env.NEXT_PUBLIC_HOST;

const axios = Axios.create({
  baseURL,
  timeout: 50000,
  headers: {
    Accept: "application/json",
    // Authorization : `Bearer ${localStorage.getItem("access_token")}`
  },
});
// axios.defaults.headers.post["Authorization"] = `Bearer ${token}`;
export default axios;
