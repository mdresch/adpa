export interface Model {
    id: string
    name: string
    provider: string
    providerId: string
    modelId: string
    isEnabled?: boolean | number
    providerOptions?: Record<string, any>
}

export type AIModel = Model
