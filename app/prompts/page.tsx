'use client';

import React, { useState, useEffect } from 'react';
import { PromptPrimary } from '@/db/schema';
import { InferSelectModel } from 'drizzle-orm';

type SelectPromptPrimary = {
  id: number;
  prompt: string;
  categoryId: number | null;
  // Add any other fields that are part of your PromptPrimary type
};

export default function PromptsPage() {
  const [prompts, setPrompts] = useState<SelectPromptPrimary[]>([]);
  const [newPrompt, setNewPrompt] = useState('');
  const [categoryId, setCategoryId] = useState<number | null>(null);

  useEffect(() => {
    fetchPrompts();
  }, []);

  const fetchPrompts = async () => {
    const response = await fetch('/api/prompts');
    if (response.ok) {
      const data = await response.json();
      setPrompts(data);
    } else {
      console.error('Failed to fetch prompts');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const response = await fetch('/api/prompts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: newPrompt, categoryId }),
    });

    if (response.ok) {
      setNewPrompt('');
      setCategoryId(null);
      fetchPrompts();
    } else {
      console.error('Failed to create prompt');
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Prompts Management</h1>
      
      <form onSubmit={handleSubmit} className="mb-8">
        <input
          type="text"
          value={newPrompt}
          onChange={(e) => setNewPrompt(e.target.value)}
          placeholder="Enter new prompt"
          className="border p-2 mr-2"
          required
        />
        <input
          type="number"
          value={categoryId || ''}
          onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : null)}
          placeholder="Category ID (optional)"
          className="border p-2 mr-2"
        />
        <button type="submit" className="bg-blue-500 text-white p-2 rounded">
          Add Prompt
        </button>
      </form>

      <h2 className="text-xl font-semibold mb-2">Existing Prompts</h2>
      <ul>
        {prompts.map((prompt) => (
          <li key={prompt.id} className="mb-2">
            {prompt.prompt} (Category ID: {prompt.categoryId || 'N/A'})
          </li>
        ))}
      </ul>
    </div>
  );
}