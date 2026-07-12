import { JobState } from '../types';

class JobService {
  private jobs = new Map<string, { state: JobState, createdAt: number }>();
  private readonly TTL_MS = 1000 * 60 * 30; // 30 minutes (privacy-safe public demo)

  createJob(id: string, totalRecords: number, batchesTotal: number): JobState {
    const job: JobState = {
      id,
      status: 'processing',
      progress: 0,
      totalRecords,
      processedRecords: 0,
      batchesTotal,
      batchesCompleted: 0
    };
    this.jobs.set(id, { state: job, createdAt: Date.now() });
    console.debug(`[Backend] JobService: Created job ${id} with ${totalRecords} records.`);
    
    // Cleanup old jobs
    this.cleanupOldJobs();
    
    return job;
  }

  getJob(id: string): JobState | undefined {
    this.cleanupOldJobs(); // Cleanup on every get to ensure timely expiration
    return this.jobs.get(id)?.state;
  }

  private cleanupOldJobs() {
    const now = Date.now();
    for (const [id, jobData] of this.jobs.entries()) {
      if (now - jobData.createdAt > this.TTL_MS) {
        console.debug(`[Backend] JobService: Cleaning up expired job ${id} (age: ${Math.round((now - jobData.createdAt) / 1000 / 60)}min)`);
        this.jobs.delete(id);
      }
    }
  }

  updateProgress(id: string, processedRecords: number, batchesCompleted: number) {
    const jobData = this.jobs.get(id);
    if (!jobData) return;
    
    const job = jobData.state;
    job.processedRecords += processedRecords;
    job.batchesCompleted += batchesCompleted;
    job.progress = Math.round((job.processedRecords / job.totalRecords) * 100);
    this.jobs.set(id, { ...jobData, state: job });
    console.debug(`[Backend] JobService: Job ${id} progress ${job.progress}% (${job.processedRecords}/${job.totalRecords})`);
  }

  public completeJob(jobId: string, result: unknown): void {
    const jobData = this.jobs.get(jobId);
    if (!jobData) return;
    
    const job = jobData.state;
    job.status = 'completed';
    job.progress = 100;
    job.result = result as any;
    this.jobs.set(jobId, { ...jobData, state: job });
    console.debug(`[Backend] JobService: Job ${jobId} completed successfully`);
  }

  public failJob(jobId: string, error: any): void {
    const jobData = this.jobs.get(jobId);
    if (!jobData) return;
    
    const job = jobData.state;
    job.status = 'failed';
    job.error = error;
    this.jobs.set(jobId, { ...jobData, state: job });
    console.error(`[Backend] JobService: Job ${jobId} failed:`, error.message || error);
  }
}

export const jobService = new JobService();
