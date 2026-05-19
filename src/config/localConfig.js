/**
 * Local API configuration file.
 * Fill in your Azure OpenAI or OpenAI credentials below.
 * This file is gitignored — your keys stay local.
 */
const localConfig = {
  // Choose: 'openai' | 'azure'
  mode: 'azure',

  // ── OpenAI mode ──
  openai: {
    apiKey: '',
    model: 'gpt-4o-mini',
    baseUrl: 'https://api.openai.com/v1',
  },

  // ── Azure OpenAI mode ──
  azure: {
    // Your Azure OpenAI endpoint (without /openai/deployments/...)
    endpoint: 'https://jimmygpt.openai.azure.com',
    // Your API key (keep this private!)
    apiKey: '3UQ8jqN5r7s9R4mF2vX1bW6cA0eH8tL3KpYdZx',
    // The deployment name you set in Azure AI Foundry
    deployment: 'gpt-5-mini',
    // API version
    apiVersion: '2024-12-01-preview',
  },
}

export default localConfig
