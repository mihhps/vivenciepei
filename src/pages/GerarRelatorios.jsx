import React from 'react';
import BotaoVoltar from "../components/BotaoVoltar"; // Importação do Botão Voltar

function GerarRelatorios() {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#e0f7fa', padding: '40px' }}>
      <BotaoVoltar /> {/* Botão Voltar no topo */}

      <div style={containerStyle}>
        <h2 style={{ textAlign: 'center', marginBottom: '20px' }}>Gerar Relatórios</h2>
        <p style={{ textAlign: 'center', fontSize: '18px', color: '#333' }}>
          Aqui você poderá gerar relatórios dos alunos e dos PEIs.
        </p>
      </div>
    </div>
  );
}

const containerStyle = {
  backgroundColor: '#ffffff',
  padding: '30px',
  borderRadius: '8px',
  boxShadow: '0 0 10px rgba(0,0,0,0.1)',
  maxWidth: '600px',
  margin: '0 auto',
};

export default GerarRelatorios;