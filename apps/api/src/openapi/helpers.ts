/** Helpers para construir request/response OpenAPI tipados. */

export function requestBody(
  schemaRef: string,
  options?: { required?: boolean; example?: unknown; description?: string }
) {
  return {
    required: options?.required ?? true,
    description: options?.description,
    content: {
      'application/json': {
        schema: { $ref: schemaRef },
        ...(options?.example !== undefined && { example: options.example }),
      },
    },
  };
}

export function apiDataResponse(
  schemaRef: string,
  description: string,
  example?: unknown
) {
  return {
    description,
    content: {
      'application/json': {
        schema: {
          type: 'object',
          required: ['data', 'error'],
          properties: {
            data: { $ref: schemaRef },
            error: { type: 'string', nullable: true, example: null },
            meta: { $ref: '#/components/schemas/ApiMeta', nullable: true },
          },
        },
        ...(example !== undefined && { example }),
      },
    },
  };
}

export function apiDataArrayResponse(
  itemSchemaRef: string,
  description: string,
  example?: unknown
) {
  return {
    description,
    content: {
      'application/json': {
        schema: {
          type: 'object',
          required: ['data', 'error'],
          properties: {
            data: { type: 'array', items: { $ref: itemSchemaRef } },
            error: { type: 'string', nullable: true, example: null },
            meta: { $ref: '#/components/schemas/ApiMeta', nullable: true },
          },
        },
        ...(example !== undefined && { example }),
      },
    },
  };
}

export function apiErrorResponse(description: string, errorExample: string) {
  return {
    description,
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/ApiResponse' },
        example: { data: null, error: errorExample },
      },
    },
  };
}
