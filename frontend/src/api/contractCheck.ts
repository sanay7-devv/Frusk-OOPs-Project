// Types generated from backend/docs/openapi/iitsm-api.json (run `npm run gen:api`).
// This file has no runtime code: it re-exports the generated schema types and asserts at
// compile time that the hand-written types in `types.ts` stay assignable to the contract,
// so a drift between the API contract and the client shows up in `tsc` / `npm run build`.
import type { components } from './schema';
import type {
  AttachmentView,
  CommentView,
  KnownOutageView,
  IncidentSummary,
} from './types';

export type Schemas = components['schemas'];

/** Compiles only when every field of A exists in B with a compatible type. */
type Conforms<A extends B, B> = A;

export type _AttachmentView = Conforms<AttachmentView, Schemas['AttachmentView']>;
export type _CommentView = Conforms<CommentView, Schemas['CommentView']>;
export type _KnownOutageView = Conforms<KnownOutageView, Schemas['KnownOutageView']>;
export type _IncidentSummary = Conforms<
  Pick<IncidentSummary, 'id' | 'code' | 'title' | 'status' | 'slaState' | 'major' | 'escalationLevel' | 'createdAt'>,
  Schemas['IncidentSummary']
>; // nullable fields (priority, assignee, ...) differ: the contract omits them instead of sending null
