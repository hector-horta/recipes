import CryptoJS from 'crypto-js';
import type { UserProfile } from '../db/db';

// En un entorno de grado médico, esta clave derivaría de un protocolo de autenticación robusto (ej. PBKDF2 desde un PIN de usuario) o un enclave seguro (WebCyrpto API).
const VAULT_KEY = import.meta.env.VITE_VAULT_KEY || 'WATI_MEDICAL_FALLBACK_KEY_0x99';

export interface MedicalProfile {
    allergies: string[];
    intolerances: string[];
    conditions: string[]; // Ej: ['SIBO', 'Crohn']
    severities: Record<string, 'mild' | 'moderate' | 'severe' | 'anaphylactic'>;
}

export const SecureVault = {
    saveProfile: (profile: MedicalProfile): void => {
        try {
            const payload = JSON.stringify(profile);
            // Cifrado AES-256
            const cipherText = CryptoJS.AES.encrypt(payload, VAULT_KEY).toString();
            localStorage.setItem('sb_shield_profile', cipherText);
        } catch (error) {
            console.error('[SecOps] Fallo de cifrado en almacenamiento local.', error);
        }
    },

    loadProfile: (): MedicalProfile | null => {
        try {
            const cipherText = localStorage.getItem('sb_shield_profile');
            if (!cipherText) return null;

            // Descifrado AES-256
            const bytes = CryptoJS.AES.decrypt(cipherText, VAULT_KEY);
            const decriptedData = bytes.toString(CryptoJS.enc.Utf8);

            if (!decriptedData) throw new Error("Corrupted or unauthorized payload");

            return JSON.parse(decriptedData) as MedicalProfile;
        } catch (error) {
            console.error('[SecOps] Violación de integridad o lectura de perfil fallida.', error);
            return null;
        }
    },

    /** Convierte un UserProfile de Dexie al formato MedicalProfile usado por SecurityScrubber */
    fromUserProfile: (userProfile: UserProfile): MedicalProfile => {
        return {
            allergies: [],
            intolerances: userProfile.intolerances || [],
            conditions: userProfile.conditions || [],
            severities: userProfile.severities || {}
        };
    }
};

