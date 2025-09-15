import React from "react";
import { Link } from "react-router-dom";
import "../index.css"; // Se você tiver um arquivo CSS global

export default function LandingPage() {
  return (
    <main className="min-h-screen">
      {/* Seção Principal */}
      <section className="relative bg-blue-900 text-white py-24 sm:py-32 overflow-hidden text-center">
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <img
            src="/logo-vivencie.png"
            alt="Logo da Vivencie PEI"
            className="mx-auto h-80 w-auto mb-4"
          />
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-tight">
            Vivencie o Crescimento.
            <br className="hidden sm:inline" />
            Vivencie o PEI.
          </h1>
          <p className="mt-4 max-w-2xl mx-auto text-lg sm:text-xl font-medium text-blue-200">
            Uma plataforma completa e intuitiva para gerenciar Planos
            Educacionais Individualizados, desenvolvida para facilitar o
            trabalho de quem ensina e o aprendizado de quem aprende.
          </p>
          <div className="mt-8 flex justify-center">
            {/* O link agora usa o componente <Link> do React Router */}
            <Link
              to="/login" // <<<<<< Rota agora aponta para o login
              className="inline-block px-10 py-4 font-semibold text-blue-900 bg-white rounded-full shadow-lg transition-transform transform hover:scale-105 hover:bg-gray-100"
            >
              Acessar a Plataforma
            </Link>
          </div>
        </div>
      </section>
      {/* Você pode adicionar as outras seções aqui */}
    </main>
  );
}
