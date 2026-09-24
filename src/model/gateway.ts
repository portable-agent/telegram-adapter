import type { operations } from '../generated/channel-api.js';

export type GatewayMessage = operations['createConversationMessage']['requestBody']['content']['application/json'];
export type GatewayResult = operations['createConversationMessage']['responses'][200]['content']['application/json'];
export type DecisionCommand = operations['decideAction']['requestBody']['content']['application/json'];
type ActionResponse = operations['decideAction']['responses'][202]['content']['application/json'];
export type ActionResult = Pick<ActionResponse, 'status'>;
