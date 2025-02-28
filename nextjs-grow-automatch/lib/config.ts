/**
 * Application configuration
 */

// Global configuration singleton
export class Config {
  private static instance: Config;
  private _candidatesToScoreCount: number = 0;

  private constructor() {}

  /**
   * Get singleton instance
   */
  public static getInstance(): Config {
    if (!Config.instance) {
      Config.instance = new Config();
    }
    return Config.instance;
  }

  /**
   * Get number of candidates to score with OpenAI
   */
  get candidatesToScoreCount(): number {
    return this._candidatesToScoreCount;
  }

  /**
   * Set number of candidates to score with OpenAI
   */
  set candidatesToScoreCount(value: number) {
    this._candidatesToScoreCount = value;
  }
}

export default Config.getInstance();