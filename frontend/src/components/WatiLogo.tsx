// frontend/src/components/WatiLogo.tsx
import React from 'react';
import '../watilogo.css'; // Asegúrate de importar tus estilos

interface WatiLogoProps {
  /**
   * Ancho del logo en píxeles. La altura se calculará automáticamente.
   * @default 160
   */
  width?: number;
  /**
   * Clase CSS adicional para el contenedor.
   */
  className?: string;
}

export const WatiLogo: React.FC<WatiLogoProps> = ({ width = 160, className = '' }) => {
  return (
    <div className={`wati-logo-container ${className}`}>
      <svg
        width={width}
        viewBox="0 0 160 64" // Basado en la composición de image_2.png
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="wati-logo-svg"
        aria-labelledby="watiLogoTitle"
        role="img"
      >
        <title id="watiLogoTitle">Wati - Nutrición Inteligente</title>

        {/* --- TEXTO PRINCIPAL: 'Wati' --- */}
        {/* Usamos var(--brand-text) para la tipografía */}
        <g className="wati-logo-text">
          {/* 'W' (La forma de la tipografía) */}
          <path d="M...Z" />
          {/* 'a' */}
          <path d="M...Z" />
          {/* 't' */}
          <path d="M...Z" />
          {/* 'i' (Solo el cuerpo) */}
          <path d="M...Z" />
        </g>

        {/* --- SÍMBOLOS INTEGRADOS --- */}

        {/* 1. Plato y Hoja sobre la 'W' (Teal) */}
        <g className="wati-logo-teal">
          {/* Forma del plato protector */}
          <path d="M...Z" />
          {/* Tallo y hoja orgánica */}
          <path d="M...Z" />
        </g>

        {/* 2. Cuenco con Vapor sobre la 'a' (Sage) */}
        <g className="wati-logo-sage">
          {/* Forma del cuenco de comida */}
          <path d="M...Z" />
          {/* Línea de vapor */}
          <path d="M...Z" />
        </g>

        {/* 3. Check de Seguridad (Mint) */}
        <path d="M...Z" className="wati-logo-mint" />

      </svg>
    </div>
  );
};