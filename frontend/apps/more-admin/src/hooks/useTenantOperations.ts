import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import type { Organization } from './useTenantQueries';

export const useTenantOperations = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);
  const [newTenant, setNewTenant] = useState({ name: '', slug: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'info' | 'users' | 'bulk'>('info');

  // Single User State in Users Tab
  const [newUser, setNewUser] = useState({ displayName: '', email: '', role: 'user' as 'admin' | 'user' });

  // Bulk CSV Upload State
  const [file, setFile] = useState<File | null>(null);
  const [parsedUsers, setParsedUsers] = useState<Array<any>>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const handleCSVFile = (selectedFile: File) => {
    setIsParsing(true);
    setParseError(null);
    setParsedUsers([]);
    setFile(selectedFile);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        if (!text) throw new Error('Empty file content.');

        const lines = text.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);
        if (lines.length === 0) throw new Error('No lines found in the CSV.');

        const headerLine = lines[0];
        const separator = headerLine.includes(';') ? ';' : ',';
        const headers = headerLine.split(separator).map(h => h.trim().replace(/^["']|["']$/g, ''));

        const displayNameIdx = headers.findIndex(h => h.toLowerCase() === 'displayname' || h.toLowerCase() === 'name');
        const emailIdx = headers.findIndex(h => h.toLowerCase() === 'email');
        const roleIdx = headers.findIndex(h => h.toLowerCase() === 'role');

        if (emailIdx === -1) throw new Error("Missing 'email' column in the header.");
        if (displayNameIdx === -1) throw new Error("Missing 'displayName' or 'name' column in the header.");

        const rows: Array<any> = [];
        for (let i = 1; i < lines.length; i++) {
          const rowLine = lines[i];
          const values = rowLine.split(separator).map(v => v.trim().replace(/^["']|["']$/g, ''));
          
          if (values.length < Math.max(displayNameIdx, emailIdx) + 1) continue;

          const email = values[emailIdx];
          const displayName = values[displayNameIdx];
          let role = 'user';
          if (roleIdx !== -1 && values[roleIdx]) {
            const roleVal = values[roleIdx].toLowerCase();
            if (roleVal === 'admin' || roleVal === 'user') role = roleVal;
          }

          if (email && displayName) rows.push({ displayName, email, role });
        }

        if (rows.length === 0) throw new Error('No valid user rows could be parsed from the CSV.');
        if (rows.length > 500) throw new Error('Limit exceeded: A maximum of 500 users is allowed per bulk request.');

        setParsedUsers(rows);
      } catch (err: any) {
        setParseError(err.message);
        toast.error(err.message);
      } finally {
        setIsParsing(false);
      }
    };
    reader.onerror = () => {
      setParseError('Error reading file.');
      setIsParsing(false);
    };
    reader.readAsText(selectedFile);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleCSVFile(e.dataTransfer.files[0]);
    }
  };

  const handleResetBulkState = () => {
    setFile(null);
    setParsedUsers([]);
    setParseError(null);
  };

  return {
    isModalOpen, setIsModalOpen,
    editingOrg, setEditingOrg,
    newTenant, setNewTenant,
    searchTerm, setSearchTerm,
    activeTab, setActiveTab,
    newUser, setNewUser,
    file, setFile,
    parsedUsers, setParsedUsers,
    parseError, setParseError,
    isParsing,
    dragActive,
    handleCSVFile,
    handleDrag,
    handleDrop,
    handleResetBulkState
  };
};
