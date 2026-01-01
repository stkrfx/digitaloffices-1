import { AsyncTask, SimpleIntervalJob } from 'toad-scheduler';
import { FastifyInstance } from 'fastify';
import { prisma } from '../db/index.js';

// --------------------------------------------------------------------------
// CLEANUP JOB
// --------------------------------------------------------------------------
// Purpose: Maintain database hygiene by removing stale unverified accounts.
// Standards:
// - Uses 'toad-scheduler' (via fastify-schedule) 
// - Runs every hour 
// - Hard deletes unverified accounts older than 24h 
// --------------------------------------------------------------------------

const TASK_ID = 'cleanup-unverified-users';

// Define the asynchronous task logic
const cleanupTask = new AsyncTask(
  TASK_ID,
  async () => {
    console.log(`🧹 [Job: ${TASK_ID}] Starting cleanup of unverified accounts...`);
    
    const cutoffDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 Hours ago

    try {
      // 1. Cleanup Users
      const deletedUsers = await prisma.user.deleteMany({
        where: {
          emailVerifiedAt: null,
          createdAt: { lt: cutoffDate },
        },
      });

      // 2. Cleanup Experts
      const deletedExperts = await prisma.expert.deleteMany({
        where: {
          emailVerifiedAt: null,
          createdAt: { lt: cutoffDate },
        },
      });

      // 3. Cleanup Organizations
      const deletedOrgs = await prisma.organization.deleteMany({
        where: {
          emailVerifiedAt: null,
          createdAt: { lt: cutoffDate },
        },
      });

      // 4. Cleanup Admins (Optional, but good for consistency if self-registration allowed)
      const deletedAdmins = await prisma.admin.deleteMany({
        where: {
          emailVerifiedAt: null,
          createdAt: { lt: cutoffDate },
        },
      });

      const total = deletedUsers.count + deletedExperts.count + deletedOrgs.count + deletedAdmins.count;
      
      if (total > 0) {
        console.log(`✅ [Job: ${TASK_ID}] Deleted ${total} unverified accounts (Users: ${deletedUsers.count}, Experts: ${deletedExperts.count}, Orgs: ${deletedOrgs.count})`);
      } else {
        console.log(`💤 [Job: ${TASK_ID}] No stale accounts found.`);
      }

    } catch (error) {
      console.error(`❌ [Job: ${TASK_ID}] Failed:`, error);
    }
  },
  (err) => {
    console.error(`❌ [Job: ${TASK_ID}] Error Handler:`, err);
  }
);

// Create the Job Schedule (Every 1 Hour)
export const cleanupJob = new SimpleIntervalJob(
  { hours: 1, runImmediately: false }, // Run every hour
  cleanupTask,
  { id: TASK_ID }
);

/**
 * Register the job with the Fastify instance
 */
export function registerCleanupJob(app: FastifyInstance) {
  // @ts-expect-error - fastify-schedule types can be tricky with the decorator
  app.scheduler.addSimpleIntervalJob(cleanupJob);
}