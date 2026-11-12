export const copy = {
  unavailable: "O serviço de autenticação está indisponível. Tente novamente.",
  username: "Use de 3 a 24 letras sem acento, números ou sublinhados.",
  taken: "Esse nome de usuário já está em uso.",
  email: "Informe um e-mail válido.",
  recovery:
    "Se houver uma conta com esse e-mail, você receberá um link para redefinir a senha.",
  invalidLink: "Este link é inválido ou expirou. Solicite um novo e-mail.",
};

export type FormState = { error?: string; message?: string };
