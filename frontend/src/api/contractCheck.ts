// Types generated from backend/docs/openapi/iitsm-api.json (run `npm run gen:api`).
// This file has no runtime code: it asserts at compile time that the hand-written types in `types.ts`
// stay compatible with the generated contract, so drift shows up in `tsc` / `npm run build`.
// The generated schema marks every field optional, while the client types model "null" explicitly, so the
// comparison ignores optionality (`undefined`) and nullability (`null`) and checks the remaining types.
import type { components } from './schema';
import type {
  AttachmentView,
  AuthResponse,
  CommentView,
  CurrentUser,
  KnownOutageView,
  IncidentSummary,
} from './types';

export type Schemas = components['schemas'];

/** The contract with every (generated-as-optional) field treated as present. */
type Req<T> = T extends (infer U)[] ? Req<U>[] : T extends object ? { [K in keyof T]-?: Req<NonNullable<T[K]>> } : T;
/** Keys where the contract (what the server sends) is not assignable to the client type A, ignoring null/undefined. */
type Mismatch<A, B> = {
  [K in keyof A & keyof B]-?: Req<NonNullable<B[K]>> extends NonNullable<A[K]> ? never : K;
}[keyof A & keyof B];
/** Keys A has that the contract does not. */
type Unknown<A, B> = Exclude<keyof A, keyof B>;
/** Compiles only when no field of A is missing from B or has an incompatible type. */
type Conforms<A, B> = [Mismatch<A, B>, Unknown<A, B>] extends [never, never] ? true : false;
type Assert<T extends true> = T;

export type _AttachmentView = Assert<Conforms<AttachmentView, Schemas['AttachmentView']>>;
export type _CommentView = Assert<Conforms<CommentView, Schemas['CommentView']>>;
export type _KnownOutageView = Assert<Conforms<KnownOutageView, Schemas['KnownOutageView']>>;
export type _IncidentSummary = Assert<Conforms<IncidentSummary, Schemas['IncidentSummary']>>;
export type _AuthResponse = Assert<Conforms<AuthResponse, Schemas['AuthResponse']>>;
export type _CurrentUser = Assert<Conforms<CurrentUser, Schemas['CurrentUserResponse']>>;
