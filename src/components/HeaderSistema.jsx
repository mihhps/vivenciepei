import React, { useState, useRef } from "react";
import { FaCalendarAlt, FaUserCircle } from "react-icons/fa";
import { db, storage } from "../firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { doc, updateDoc } from "firebase/firestore";
import { toast } from "react-toastify";
import "../styles/HeaderSistema.css";

export default function HeaderSistema({ usuario }) {
  const [anoAtivo, setAnoAtivo] = useState(
    localStorage.getItem("anoExercicio") || "2025"
  );
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const mudarAno = (e) => {
    const novoAno = e.target.value;
    setAnoAtivo(novoAno);
    localStorage.setItem("anoExercicio", novoAno);
    window.location.reload();
  };

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (!file || !usuario) return;

    setUploading(true);
    const uid = usuario.uid || usuario.id;
    const storageRef = ref(storage, `fotos-perfil/${uid}`);

    try {
      await uploadBytes(storageRef, file);
      const photoURL = await getDownloadURL(storageRef);
      const userDocRef = doc(db, "usuarios", uid);
      await updateDoc(userDocRef, { photoURL });

      // Atualiza o localstorage para refletir a nova foto
      const usuarioAtualizado = { ...usuario, photoURL };
      localStorage.setItem("usuarioLogado", JSON.stringify(usuarioAtualizado));

      toast.success("Foto atualizada!");
      window.location.reload();
    } catch (error) {
      toast.error("Erro no upload.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <header className="header-sistema-ipm">
      <div className="header-left">
        <div className="seletor-exercicio-container">
          <div className="label-exercicio">
            <FaCalendarAlt className="icon-calendar" />
            <span>EXERCÍCIO</span>
          </div>
          <select
            value={anoAtivo}
            onChange={mudarAno}
            className="select-ano-exercicio"
          >
            <option value="2024">2024</option>
            <option value="2025">2025</option>
            <option value="2026">2026</option>
          </select>
        </div>
      </div>

      <div className="header-right">
        <div
          className="user-profile-info"
          onClick={() => fileInputRef.current.click()}
          style={{ cursor: "pointer" }}
          title="Clique para mudar a foto"
        >
          <div className="user-text">
            <span className="user-name-header">
              {usuario?.nome || "Usuário"}
            </span>
            <span className="user-perfil-header">
              {usuario?.perfil || "Perfil"}
            </span>
          </div>

          <div className="avatar-header-wrapper">
            {usuario?.photoURL ? (
              <img
                src={usuario.photoURL}
                alt="Perfil"
                className={`img-perfil-header ${uploading ? "blur" : ""}`}
              />
            ) : (
              <FaUserCircle className="icon-perfil-header" />
            )}
            {uploading && <div className="loader-mini"></div>}
          </div>

          <input
            type="file"
            ref={fileInputRef}
            style={{ display: "none" }}
            onChange={handleFileChange}
            accept="image/*"
          />
        </div>
      </div>
    </header>
  );
}
