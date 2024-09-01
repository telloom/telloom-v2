"use client";

import { useState, useEffect } from 'react';
import { createEntitlementAction, getAllEntitlementsAction, updateEntitlementAction, deleteEntitlementAction } from '@/actions/entitlements-actions';
import { ActionState } from '@/types';

export default function EntitlementsPage() {
  const [entitlements, setEntitlements] = useState<any[]>([]);
  const [newEntitlement, setNewEntitlement] = useState({ revenuecatId: '', lookupKey: '', displayName: '' });
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchEntitlements();
  }, []);

  async function fetchEntitlements() {
    const result = await getAllEntitlementsAction();
    if (result.status === 'success') {
      setEntitlements(result.data);
    } else {
      setMessage(result.message);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const result = await createEntitlementAction(newEntitlement as any);
    setMessage(result.message);
    if (result.status === 'success') {
      setNewEntitlement({ revenuecatId: '', lookupKey: '', displayName: '' });
      fetchEntitlements();
    }
  }

  async function handleUpdate(id: bigint, data: Partial<any>) {
    const result = await updateEntitlementAction(id, data);
    setMessage(result.message);
    if (result.status === 'success') {
      fetchEntitlements();
    }
  }

  async function handleDelete(id: bigint) {
    const result = await deleteEntitlementAction(id);
    setMessage(result.message);
    if (result.status === 'success') {
      fetchEntitlements();
    }
  }

  return (
    <div>
      <h1>Entitlements</h1>
      {message && <p>{message}</p>}
      <form onSubmit={handleCreate}>
        <input
          type="text"
          placeholder="RevenueCat ID"
          value={newEntitlement.revenuecatId}
          onChange={(e) => setNewEntitlement({ ...newEntitlement, revenuecatId: e.target.value })}
        />
        <input
          type="text"
          placeholder="Lookup Key"
          value={newEntitlement.lookupKey}
          onChange={(e) => setNewEntitlement({ ...newEntitlement, lookupKey: e.target.value })}
        />
        <input
          type="text"
          placeholder="Display Name"
          value={newEntitlement.displayName}
          onChange={(e) => setNewEntitlement({ ...newEntitlement, displayName: e.target.value })}
        />
        <button type="submit">Create Entitlement</button>
      </form>
      <ul>
        {entitlements.map((entitlement) => (
          <li key={entitlement.id}>
            {entitlement.displayName} ({entitlement.revenuecatId})
            <button onClick={() => handleUpdate(entitlement.id, { displayName: 'Updated Name' })}>Update</button>
            <button onClick={() => handleDelete(entitlement.id)}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
}