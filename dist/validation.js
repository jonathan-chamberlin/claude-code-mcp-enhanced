import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
/**
 * Validate that toolArguments contains a required string parameter.
 * Throws McpError with InvalidParams if missing or wrong type.
 */
export function requireStringParam(toolArguments, paramName, toolName) {
    if (!toolArguments ||
        typeof toolArguments !== 'object' ||
        !(paramName in toolArguments) ||
        typeof toolArguments[paramName] !== 'string') {
        throw new McpError(ErrorCode.InvalidParams, `Missing or invalid required parameter: ${paramName} (must be a string) for ${toolName} tool`);
    }
    return toolArguments[paramName];
}
