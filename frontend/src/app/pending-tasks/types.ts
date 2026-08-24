export interface PendingTaskRow {
  _id: string;
  college_id: {
    _id: string;
    college_name: string;
    college_code: string;
    logo_url?: string;
    location?: string;
  } | string;
  coordinator_id?: {
    _id: string;
    full_name: string;
    official_email: string;
  } | string;
  company_id?: {
    _id: string;
    company_name: string;
    domain?: string;
    logo_url?: string;
  } | string;
  serial_no: number;
  company_name: string;
  jd_received_date?: string | null;
  db_shared_date?: string | null;
  db_shared_status: string;
  current_status: string;
  next_status?: string;
  action_to_be_taken: string;
  drive_date?: string | null;
  remarks?: string;
  is_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface PendingTaskKpiData {
  total_tasks: number;
  db_shared_count: number;
  db_pending_count: number;
  drives_scheduled_count: number;
  actions_pending_count: number;
}
