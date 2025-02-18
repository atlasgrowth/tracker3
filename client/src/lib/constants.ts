export const PIPELINE_STAGES = {
  website_created: {
    label: "Website Created",
    color: "bg-blue-500"
  },
  website_sent: {
    label: "Website Sent",
    color: "bg-indigo-500"
  },
  website_viewed: {
    label: "Website Viewed",
    color: "bg-purple-500"
  },
  lead_contacted: {
    label: "Lead Contacted",
    color: "bg-green-500"
  },
  follow_up: {
    label: "Follow Up",
    color: "bg-orange-500"
  },
  not_interested: {
    label: "Not Interested",
    color: "bg-gray-500"
  }
} as const;

export type PipelineStage = keyof typeof PIPELINE_STAGES;
