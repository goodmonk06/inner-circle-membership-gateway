/**
 * Metrics collection utility
 * In production, this could integrate with Prometheus, DataDog, or similar
 */

import { logger } from '../logger';

export interface MetricLabels {
  [key: string]: string | number;
}

class MetricsCollector {
  private counters: Map<string, number> = new Map();
  private histograms: Map<string, number[]> = new Map();

  /**
   * Increment a counter metric
   */
  incrementCounter(name: string, labels?: MetricLabels, value: number = 1): void {
    const key = this.makeKey(name, labels);
    const current = this.counters.get(key) || 0;
    this.counters.set(key, current + value);

    if (process.env.NODE_ENV === 'development') {
      logger.debug('Metric counter incremented', { name, labels, value, total: current + value });
    }
  }

  /**
   * Record a histogram value (e.g., duration, size)
   */
  recordHistogram(name: string, value: number, labels?: MetricLabels): void {
    const key = this.makeKey(name, labels);
    const values = this.histograms.get(key) || [];
    values.push(value);
    this.histograms.set(key, values);

    if (process.env.NODE_ENV === 'development') {
      logger.debug('Metric histogram recorded', { name, labels, value });
    }
  }

  /**
   * Record a gauge value (current state)
   */
  recordGauge(name: string, value: number, labels?: MetricLabels): void {
    const key = this.makeKey(name, labels);
    this.counters.set(key, value);

    if (process.env.NODE_ENV === 'development') {
      logger.debug('Metric gauge recorded', { name, labels, value });
    }
  }

  /**
   * Time an operation
   */
  async time<T>(
    name: string,
    operation: () => Promise<T>,
    labels?: MetricLabels
  ): Promise<T> {
    const start = Date.now();
    try {
      const result = await operation();
      const duration = Date.now() - start;
      this.recordHistogram(`${name}_duration_ms`, duration, labels);
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      this.recordHistogram(`${name}_duration_ms`, duration, { ...labels, error: 'true' });
      throw error;
    }
  }

  /**
   * Get current metrics snapshot
   */
  getSnapshot(): {
    counters: Record<string, number>;
    histograms: Record<string, { count: number; sum: number; avg: number; min: number; max: number }>;
  } {
    const counters: Record<string, number> = {};
    this.counters.forEach((value, key) => {
      counters[key] = value;
    });

    const histograms: Record<string, { count: number; sum: number; avg: number; min: number; max: number }> = {};
    this.histograms.forEach((values, key) => {
      if (values.length > 0) {
        const sum = values.reduce((a, b) => a + b, 0);
        histograms[key] = {
          count: values.length,
          sum,
          avg: sum / values.length,
          min: Math.min(...values),
          max: Math.max(...values),
        };
      }
    });

    return { counters, histograms };
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.counters.clear();
    this.histograms.clear();
  }

  private makeKey(name: string, labels?: MetricLabels): string {
    if (!labels || Object.keys(labels).length === 0) {
      return name;
    }
    const labelStr = Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}="${v}"`)
      .join(',');
    return `${name}{${labelStr}}`;
  }
}

export const metrics = new MetricsCollector();

// Common metric names
export const METRICS = {
  TIER_EVALUATION: 'tier_evaluation',
  TIER_EVALUATION_DURATION: 'tier_evaluation_duration_ms',
  TIER_CHANGED: 'tier_changed',
  APPLICATION_SUBMITTED: 'application_submitted',
  APPLICATION_REVIEWED: 'application_reviewed',
  BENEFIT_CHECKED: 'benefit_checked',
  ACTIVITY_LOGGED: 'activity_logged',
  WEBHOOK_SENT: 'webhook_sent',
  API_REQUEST: 'api_request',
  API_ERROR: 'api_error',
};
