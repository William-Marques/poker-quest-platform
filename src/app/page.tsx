import Link from "next/link";

export default function Home() {
  return (
    <main className="home">
      <h1>Poker Quest</h1>
      <nav aria-label="Conta">
        <Link className="button" href="/cadastro">
          Criar conta
        </Link>
        <Link className="button secondary" href="/entrar">
          Entrar
        </Link>
      </nav>
    </main>
  );
}
