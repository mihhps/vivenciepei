// src/components/Loader.jsx
import React from "react";

const Loader = () => (
  <div style={{
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    height: "100vh"
  }}>
    <div style={{
      border: "4px solid rgba(0, 0, 0, 0.1)",
      width: "36px",
      height: "36px",
      borderRadius: "50%",
      borderLeftColor: "#1d3557",
      animation: "spin 1s linear infinite"
    }}></div>
  </div>
);

export default Loader;