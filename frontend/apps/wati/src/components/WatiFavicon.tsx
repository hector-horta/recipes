// frontend/src/components/WatiFavicon.tsx
import React from 'react';
import '../watifavicon.css'; // Necesita estilos específicos

export const WatiFavicon: React.FC = () => {
    return (
        <svg
            width="32" // Tamaño estándar para favicons responsivos
            height="32"
            viewBox="0 0 32 32"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            role="img"
            aria-label="Favicon de Wati"
        >
            {/* 1. Círculo de fondo (Mint) */}
            <circle cx="16" cy="16" r="16" className="wati-favicon-bg" />

            {/* 2. 'W' Verificada simplificada (Forest) */}
            <g className="wati-favicon-symbol">
                <path d="M...Z" /> {/* La 'W' estilizada */}
                <path d="M...Z" /> {/* El check de seguridad */}
            </g>
        </svg>
    );
};