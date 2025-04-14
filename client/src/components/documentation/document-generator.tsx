import { SowGenerator } from "./sow-generator";

interface DocumentGeneratorProps {
  projectId: number;
}

export function DocumentGenerator({ projectId }: DocumentGeneratorProps) {
  return <SowGenerator projectId={projectId} />;
}