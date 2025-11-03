import Conf from 'conf';
import { randomUUID } from 'crypto';

interface SessionConfigSchema {
  sessionId: string;
}

class SessionService {
  private config: Conf<SessionConfigSchema>;

  constructor() {
    this.config = new Conf<SessionConfigSchema>({
      projectName: 'radiocrestin-cli',
      defaults: {
        sessionId: '',
      },
    });

    // Generate session ID if it doesn't exist
    if (!this.config.get('sessionId')) {
      this.config.set('sessionId', randomUUID());
    }
  }

  getSessionId(): string {
    return this.config.get('sessionId');
  }

  regenerateSessionId(): string {
    const newSessionId = randomUUID();
    this.config.set('sessionId', newSessionId);
    return newSessionId;
  }
}

export const sessionService = new SessionService();
