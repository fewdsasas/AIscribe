import { LLMProvider } from './llm-provider'

/**
 * Factory for creating LLMProvider instances.
 *
 * Decouples object creation from ServiceRegistry so the registry only depends
 * on the LLMProvider class for construction, not its internal wiring.
 */
export class LLMProviderFactory {
  static create(): LLMProvider {
    return new LLMProvider()
  }
}
