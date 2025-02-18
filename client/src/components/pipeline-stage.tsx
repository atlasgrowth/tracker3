import { Badge } from "@/components/ui/badge";
import { PIPELINE_STAGES, type PipelineStage } from "@/lib/constants";

interface PipelineStageProps {
  stage: PipelineStage;
}

export function PipelineStage({ stage }: PipelineStageProps) {
  const { label, color } = PIPELINE_STAGES[stage];
  
  return (
    <Badge className={`${color} hover:${color}`}>
      {label}
    </Badge>
  );
}
