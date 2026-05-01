/**
 * Server-only DB query layer. Imported by Vercel Functions and Server Components.
 *
 * NEVER import from this from a `'use client'` component. The DB driver pulls in
 * Node-only deps (TLS sockets etc.) that don't exist in the browser bundle.
 */

import 'server-only';

export * from './player';
export * from './team';
