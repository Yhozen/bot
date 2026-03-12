import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";
 
export const env = createEnv({
  server: {
    SLACK_BOT_TOKEN: z.string(),
    SLACK_SIGNING_SECRET: z.string(),
    REDIS_URL: z.url(),
  },
  experimental__runtimeEnv: true
});