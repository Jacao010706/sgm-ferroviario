path = r"C:\Users\jacques.siman\sgm-ferroviario\frontend\src\lib\api.ts"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

old = '''api.interceptors.response.use(
  (r) => r,
  async (error) => {
    if (error.response?.status === 401 && typeof window !== "undefined") {'''

new = '''api.interceptors.response.use(
  (r) => r,
  async (error) => {
    const isCredError = error.response?.data?.detail === "Credenciais invalidas";
    if ((error.response?.status === 401 || (error.response?.status === 500 && isCredError)) && typeof window !== "undefined") {'''

if old in content:
    content = content.replace(old, new)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print("OK")
else:
    print("ERRO")
