export type CandidateStatus =
  | "sourced"
  | "applied"
  | "interview"
  | "offer"
  | "hired"
  | "rejected";

export type Candidate = {
  id: number;
  name: string;
  title: string;
  location: string;
  experienceYears: number;
  skills: string[];      
  status: CandidateStatus;
  updatedAt: number;     
};
