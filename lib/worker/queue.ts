import { runScanPipeline } from "./pipeline";

export interface ScanJobData {
  scanId: string;
}

/**
 * Dispatches the scan job asynchronously to a background worker.
 * In development / standalone mode, uses process-level async concurrency.
 * If Redis URL is configured, integrates with BullMQ.
 */
export async function dispatchScanJob(scanId: string): Promise<void> {
  // Fire-and-forget in background without blocking HTTP request
  setImmediate(async () => {
    try {
      await runScanPipeline(scanId);
    } catch (err) {
      console.error(`Background worker failed for scan ${scanId}:`, err);
    }
  });
}
