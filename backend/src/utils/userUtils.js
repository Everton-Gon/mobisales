// Remove senha antes de devolver dados do usuário para o frontend
export function publicUser(user) {
  const { password, ...safeUser } = user;
  return { ...safeUser, perfil: String(safeUser.perfil ?? '').toLowerCase() };
}

export function publicUsers(users) {
  return users.map(({ password, ...safeUser }) => safeUser);
}
