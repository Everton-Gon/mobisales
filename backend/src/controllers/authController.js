import { publicUser, publicUsers } from '../utils/userUtils.js';

export async function handleLogin(body, { users, useMysql, mysqlService }) {
  const login = String(body.login ?? '').trim().toLowerCase();
  const user = useMysql
    ? await mysqlService.getUserForLogin(login)
    : users.find((item) => item.login === login && item.password === body.password && item.ativo);

  if (!user || user.password !== body.password) {
    return { ok: false, message: 'Login ou senha invalidos' };
  }

  return { ok: true, user: publicUser(user) };
}

export async function handleGetUsers(data) {
  const users = data.useMysql 
    ? (await data.mysqlService.getBootstrap()).users 
    : data.users;
  return { ok: true, users: publicUsers(users) };
}
