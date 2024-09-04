'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { PromptPrimary } from '@/db/schema';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

export default function PromptsPage() {
  const { toast } = useToast();
  const [prompts, setPrompts] = useState<PromptPrimary[]>([]);
  const [newPrompt, setNewPrompt] = useState('');

  const fetchPrompts = useCallback(async () => {
    const response = await fetch('/api/prompts');
    if (response.ok) {
      const data = await response.json();
      setPrompts(data);
    } else {
      console.error('Failed to fetch prompts');
      toast({
        title: "Error",
        description: "Failed to fetch prompts",
        variant: "destructive",
      });
    }
  }, [toast]);

  useEffect(() => {
    fetchPrompts();
  }, [fetchPrompts]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const response = await fetch('/api/prompts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: newPrompt }),
    });

    if (response.ok) {
      setNewPrompt('');
      fetchPrompts();
      toast({
        title: "Success",
        description: "Prompt created successfully",
      });
    } else {
      console.error('Failed to create prompt');
      toast({
        title: "Error",
        description: "Failed to create prompt",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Prompts Management</h1>
      
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Create New Prompt</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex space-x-2">
            <Input
              type="text"
              value={newPrompt}
              onChange={(e) => setNewPrompt(e.target.value)}
              placeholder="Enter new prompt"
              className="flex-grow"
              required
            />
            <Button type="submit">Add Prompt</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Existing Prompts</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {prompts.map((prompt) => (
              <li key={prompt.id} className="bg-gray-100 p-2 rounded">
                {prompt.prompt}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}