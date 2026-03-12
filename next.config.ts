import type { NextConfig } from "next";
import { withWorkflow } from "workflow/next";
import "@/env";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
};

export default withWorkflow(nextConfig);
