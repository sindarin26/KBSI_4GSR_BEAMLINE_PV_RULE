#!/usr/bin/env node

console.error("DEPRECATED: scripts/database_pool_pilot/review_workbench.js no longer starts a server.");
console.error("Use: node scripts/review_server.js --database-pool <pool_id> --port 8765");
console.error("Wrapper: ./run_database_pool_workbench.sh [pool_id ...]");
console.error("See: notes/2026-06-01_review_workbench_unification_goal.md");
process.exit(1);
