import axios from "axios";

/**
 * Cliente do painel CCO.
 *
 * Aponta para o proxy do proprio Next (/api/cco), nao para o backend direto.
 * Nao carrega token nenhum: quem autentica no FastAPI e o servidor. O
 * navegador so leva o cookie de sessao do CCO, que e httpOnly.
 */
export const panelApi = axios.create({
  baseURL: "/api/cco",
  timeout: 15000,
  withCredentials: true,
});
