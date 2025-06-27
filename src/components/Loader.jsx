// src/components/Loader.jsx
import React from "react";
import "./Loader.css"; // OU o caminho para o seu CSS global se preferir

const Loader = () => (
  <div className="loader-container">
    {" "}
    {/* Usa a classe CSS */}
    <div className="spinner"></div> {/* Usa a classe CSS */}
  </div>
);

export default Loader;
