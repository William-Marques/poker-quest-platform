export function usernameFrom(value: FormDataEntryValue | null) {
  const username = typeof value === "string" ? value.trim().toLowerCase() : "";
  return /^[a-z0-9_]{3,24}$/.test(username) ? username : null;
}

export function emailFrom(value: FormDataEntryValue | null) {
  const email = typeof value === "string" ? value.trim().toLowerCase() : "";
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ? email
    : null;
}

export function passwordError(password: unknown, confirmation: unknown) {
  if (
    typeof password !== "string" ||
    password.length < 8 ||
    new TextEncoder().encode(password).length > 72
  ) {
    return "Use pelo menos 8 caracteres e no máximo 72 bytes na senha.";
  }
  return password === confirmation ? null : "As senhas precisam ser iguais.";
}
