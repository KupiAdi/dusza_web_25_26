const API_URL = import.meta.env.VITE_API_URL || '/backend';

class ApiService {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('auth_token');
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('auth_token', token);
    } else {
      localStorage.removeItem('auth_token');
    }
  }

  getToken() {
    return this.token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Hiba történt a kérés során');
    }

    return data;
  }

  // Auth endpoints
  async register(username: string, email: string, password: string) {
    return this.request<{ success: boolean; token: string; user: any }>(
      '/api/auth/register',
      {
        method: 'POST',
        body: JSON.stringify({ username, email, password }),
      }
    );
  }

  async login(username: string, password: string) {
    return this.request<{ success: boolean; token: string; user: any }>(
      '/api/auth/login',
      {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      }
    );
  }

  async getCurrentUser() {
    return this.request<{ user: any }>('/api/auth/me');
  }

  async markTutorialCompleted() {
    return this.request<{ success: boolean; message: string }>(
      '/api/auth/tutorial',
      { method: 'PATCH' }
    );
  }

  // Environment endpoints
  async getEnvironments() {
    return this.request<{ environments: any[] }>('/api/environments');
  }

  async saveEnvironment(environment: any) {
    return this.request<{ success: boolean; message: string }>(
      '/api/environments',
      {
        method: 'POST',
        body: JSON.stringify({ environment }),
      }
    );
  }

  async deleteEnvironment(environmentId: string) {
    return this.request<{ success: boolean; message: string }>(
      `/api/environments/${environmentId}`,
      {
        method: 'DELETE',
      }
    );
  }

  async updateCardImage(envId: string, cardId: string, backgroundImage: string) {
    return this.request<{ success: boolean; message: string }>(
      `/api/environments/${envId}/cards/${cardId}/image`,
      {
        method: 'PATCH',
        body: JSON.stringify({ backgroundImage }),
      }
    );
  }

  // Player endpoints
  async getPlayers() {
    return this.request<{ players: any[] }>('/api/players');
  }

  async createPlayer(player: any) {
    return this.request<{ success: boolean; message: string }>(
      '/api/players',
      {
        method: 'POST',
        body: JSON.stringify({ player }),
      }
    );
  }

  async updatePlayer(playerId: string, updates: any) {
    return this.request<{ success: boolean; message: string }>(
      `/api/players/${playerId}`,
      {
        method: 'PUT',
        body: JSON.stringify({ updates }),
      }
    );
  }

  async deletePlayer(playerId: string) {
    return this.request<{ success: boolean; message: string }>(
      `/api/players/${playerId}`,
      {
        method: 'DELETE',
      }
    );
  }

  // Image generation
  async generateImage(prompt: string, filename?: string) {
    return this.request<{
      success: boolean;
      filename: string;
      path: string;
      url: string;
      cached: boolean;
    }>('/api/generate-image', {
      method: 'POST',
      body: JSON.stringify({ prompt, filename }),
    });
  }
}

export const api = new ApiService();

