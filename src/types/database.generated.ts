
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "public": {
          Tables: {
            "account_roles": {
                  Row: {
                    "created_at": string,"granted_at": string,"granted_by": string | null,"role": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"granted_at"?: string,"granted_by"?: string | null,"role"?: string,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"granted_at"?: string,"granted_by"?: string | null,"role"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "account_roles_granted_by_fkey"
      columns: ["granted_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "account_roles_user_id_fkey"
      columns: ["user_id"]
isOneToOne: true
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"activity_events": {
                  Row: {
                    "actor_id": string | null,"assignment_id": string | null,"created_at": string,"dedupe_key": string,"event_type": string,"gig_id": string | null,"id": string,"payload": NonNullable<Json>,"read_at": string | null,"recipient_id": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "actor_id"?: string | null,"assignment_id"?: string | null,"created_at"?: string,"dedupe_key": string,"event_type": string,"gig_id"?: string | null,"id"?: string,"payload"?: NonNullable<Json>,"read_at"?: string | null,"recipient_id": string,"updated_at"?: string
                  }
                  Update: {
                    "actor_id"?: string | null,"assignment_id"?: string | null,"created_at"?: string,"dedupe_key"?: string,"event_type"?: string,"gig_id"?: string | null,"id"?: string,"payload"?: NonNullable<Json>,"read_at"?: string | null,"recipient_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "activity_events_actor_id_fkey"
      columns: ["actor_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "activity_events_assignment_id_fkey"
      columns: ["assignment_id"]
isOneToOne: false
      referencedRelation: "assignments"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "activity_events_gig_id_fkey"
      columns: ["gig_id"]
isOneToOne: false
      referencedRelation: "gigs"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "activity_events_recipient_id_fkey"
      columns: ["recipient_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"admin_actions": {
                  Row: {
                    "action_type": string,"admin_id": string,"created_at": string,"details": NonNullable<Json>,"id": string,"report_id": string | null,"target_id": string,"target_type": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "action_type": string,"admin_id": string,"created_at"?: string,"details"?: NonNullable<Json>,"id"?: string,"report_id"?: string | null,"target_id": string,"target_type": string,"updated_at"?: string
                  }
                  Update: {
                    "action_type"?: string,"admin_id"?: string,"created_at"?: string,"details"?: NonNullable<Json>,"id"?: string,"report_id"?: string | null,"target_id"?: string,"target_type"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "admin_actions_admin_id_fkey"
      columns: ["admin_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "admin_actions_report_id_fkey"
      columns: ["report_id"]
isOneToOne: false
      referencedRelation: "reports"
      referencedColumns: ["id"]
    }
                  ]
                },"ai_request_log": {
                  Row: {
                    "created_at": string,"duration_ms": number | null,"error_code": string | null,"id": string,"input_chars": number,"output_chars": number | null,"provider": string,"request_id": string,"status": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"duration_ms"?: number | null,"error_code"?: string | null,"id"?: string,"input_chars": number,"output_chars"?: number | null,"provider": string,"request_id": string,"status": string,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"duration_ms"?: number | null,"error_code"?: string | null,"id"?: string,"input_chars"?: number,"output_chars"?: number | null,"provider"?: string,"request_id"?: string,"status"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "ai_request_log_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"applications": {
                  Row: {
                    "client_request_id": string,"created_at": string,"decided_at": string | null,"gig_id": string,"id": string,"message": string | null,"status": string,"updated_at": string,"worker_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "client_request_id": string,"created_at"?: string,"decided_at"?: string | null,"gig_id": string,"id"?: string,"message"?: string | null,"status"?: string,"updated_at"?: string,"worker_id": string
                  }
                  Update: {
                    "client_request_id"?: string,"created_at"?: string,"decided_at"?: string | null,"gig_id"?: string,"id"?: string,"message"?: string | null,"status"?: string,"updated_at"?: string,"worker_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "applications_gig_id_fkey"
      columns: ["gig_id"]
isOneToOne: false
      referencedRelation: "gigs"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "applications_worker_id_fkey"
      columns: ["worker_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"assignments": {
                  Row: {
                    "agreed_amount": number,"agreed_description": string,"agreed_title": string,"agreement_version": number,"application_id": string,"cancelled_at": string | null,"client_request_id": string,"completed_at": string | null,"created_at": string,"currency": string,"due_at": string | null,"employer_confirmed_at": string,"employer_id": string,"gig_id": string,"id": string,"started_at": string | null,"status": string,"updated_at": string,"worker_confirmed_at": string | null,"worker_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "agreed_amount": number,"agreed_description": string,"agreed_title": string,"agreement_version"?: number,"application_id": string,"cancelled_at"?: string | null,"client_request_id": string,"completed_at"?: string | null,"created_at"?: string,"currency"?: string,"due_at"?: string | null,"employer_confirmed_at": string,"employer_id": string,"gig_id": string,"id"?: string,"started_at"?: string | null,"status"?: string,"updated_at"?: string,"worker_confirmed_at"?: string | null,"worker_id": string
                  }
                  Update: {
                    "agreed_amount"?: number,"agreed_description"?: string,"agreed_title"?: string,"agreement_version"?: number,"application_id"?: string,"cancelled_at"?: string | null,"client_request_id"?: string,"completed_at"?: string | null,"created_at"?: string,"currency"?: string,"due_at"?: string | null,"employer_confirmed_at"?: string,"employer_id"?: string,"gig_id"?: string,"id"?: string,"started_at"?: string | null,"status"?: string,"updated_at"?: string,"worker_confirmed_at"?: string | null,"worker_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "assignments_application_gig_worker_fk"
      columns: ["application_id","gig_id","worker_id"]
isOneToOne: false
      referencedRelation: "applications"
      referencedColumns: ["id","gig_id","worker_id"]
    },{
      foreignKeyName: "assignments_application_id_fkey"
      columns: ["application_id"]
isOneToOne: true
      referencedRelation: "applications"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "assignments_employer_id_fkey"
      columns: ["employer_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "assignments_gig_employer_fk"
      columns: ["gig_id","employer_id"]
isOneToOne: false
      referencedRelation: "gigs"
      referencedColumns: ["id","employer_id"]
    },{
      foreignKeyName: "assignments_gig_id_fkey"
      columns: ["gig_id"]
isOneToOne: false
      referencedRelation: "gigs"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "assignments_worker_id_fkey"
      columns: ["worker_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"gig_private_locations": {
                  Row: {
                    "address_text": string | null,"created_at": string,"gig_id": string,"id": string,"instructions": string | null,"latitude": number,"longitude": number,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "address_text"?: string | null,"created_at"?: string,"gig_id": string,"id"?: string,"instructions"?: string | null,"latitude": number,"longitude": number,"updated_at"?: string
                  }
                  Update: {
                    "address_text"?: string | null,"created_at"?: string,"gig_id"?: string,"id"?: string,"instructions"?: string | null,"latitude"?: number,"longitude"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "gig_private_locations_gig_id_fkey"
      columns: ["gig_id"]
isOneToOne: true
      referencedRelation: "gigs"
      referencedColumns: ["id"]
    }
                  ]
                },"gigs": {
                  Row: {
                    "application_deadline": string | null,"budget_amount": number,"category": string,"closed_at": string | null,"created_at": string,"currency": string,"description": string,"due_at": string | null,"employer_id": string,"id": string,"public_area": string | null,"public_latitude": number | null,"public_longitude": number | null,"published_at": string | null,"status": string,"title": string,"updated_at": string,"work_mode": string
                  }
                  ComputedFields: never
                  Insert: {
                    "application_deadline"?: string | null,"budget_amount": number,"category": string,"closed_at"?: string | null,"created_at"?: string,"currency"?: string,"description": string,"due_at"?: string | null,"employer_id": string,"id"?: string,"public_area"?: string | null,"public_latitude"?: number | null,"public_longitude"?: number | null,"published_at"?: string | null,"status"?: string,"title": string,"updated_at"?: string,"work_mode": string
                  }
                  Update: {
                    "application_deadline"?: string | null,"budget_amount"?: number,"category"?: string,"closed_at"?: string | null,"created_at"?: string,"currency"?: string,"description"?: string,"due_at"?: string | null,"employer_id"?: string,"id"?: string,"public_area"?: string | null,"public_latitude"?: number | null,"public_longitude"?: number | null,"published_at"?: string | null,"status"?: string,"title"?: string,"updated_at"?: string,"work_mode"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "gigs_employer_id_fkey"
      columns: ["employer_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"milestones": {
                  Row: {
                    "approved_at": string | null,"assignment_id": string,"created_at": string,"description": string | null,"due_at": string | null,"id": string,"position": number,"status": string,"title": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "approved_at"?: string | null,"assignment_id": string,"created_at"?: string,"description"?: string | null,"due_at"?: string | null,"id"?: string,"position": number,"status"?: string,"title": string,"updated_at"?: string
                  }
                  Update: {
                    "approved_at"?: string | null,"assignment_id"?: string,"created_at"?: string,"description"?: string | null,"due_at"?: string | null,"id"?: string,"position"?: number,"status"?: string,"title"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "milestones_assignment_id_fkey"
      columns: ["assignment_id"]
isOneToOne: false
      referencedRelation: "assignments"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "avatar_path": string | null,"bio": string | null,"created_at": string,"display_name": string,"home_area": string | null,"id": string,"onboarding_completed_at": string | null,"preferred_mode": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "avatar_path"?: string | null,"bio"?: string | null,"created_at"?: string,"display_name": string,"home_area"?: string | null,"id": string,"onboarding_completed_at"?: string | null,"preferred_mode"?: string,"updated_at"?: string
                  }
                  Update: {
                    "avatar_path"?: string | null,"bio"?: string | null,"created_at"?: string,"display_name"?: string,"home_area"?: string | null,"id"?: string,"onboarding_completed_at"?: string | null,"preferred_mode"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"reports": {
                  Row: {
                    "assignment_id": string | null,"category": string,"client_request_id": string,"created_at": string,"details": string,"gig_id": string | null,"id": string,"reporter_id": string,"resolution_note": string | null,"reviewed_at": string | null,"reviewed_by": string | null,"status": string,"subject_profile_id": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "assignment_id"?: string | null,"category": string,"client_request_id": string,"created_at"?: string,"details": string,"gig_id"?: string | null,"id"?: string,"reporter_id": string,"resolution_note"?: string | null,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"status"?: string,"subject_profile_id"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "assignment_id"?: string | null,"category"?: string,"client_request_id"?: string,"created_at"?: string,"details"?: string,"gig_id"?: string | null,"id"?: string,"reporter_id"?: string,"resolution_note"?: string | null,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"status"?: string,"subject_profile_id"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "reports_assignment_id_fkey"
      columns: ["assignment_id"]
isOneToOne: false
      referencedRelation: "assignments"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reports_gig_id_fkey"
      columns: ["gig_id"]
isOneToOne: false
      referencedRelation: "gigs"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reports_reporter_id_fkey"
      columns: ["reporter_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reports_reviewed_by_fkey"
      columns: ["reviewed_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reports_subject_profile_id_fkey"
      columns: ["subject_profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"submission_files": {
                  Row: {
                    "created_at": string,"id": string,"media_type": string,"object_path": string,"size_bytes": number,"submission_id": string,"updated_at": string,"uploader_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"media_type": string,"object_path": string,"size_bytes": number,"submission_id": string,"updated_at"?: string,"uploader_id": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"media_type"?: string,"object_path"?: string,"size_bytes"?: number,"submission_id"?: string,"updated_at"?: string,"uploader_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "submission_files_submission_id_fkey"
      columns: ["submission_id"]
isOneToOne: false
      referencedRelation: "submissions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "submission_files_submission_uploader_fk"
      columns: ["submission_id","uploader_id"]
isOneToOne: false
      referencedRelation: "submissions"
      referencedColumns: ["id","submitted_by"]
    },{
      foreignKeyName: "submission_files_uploader_id_fkey"
      columns: ["uploader_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"submissions": {
                  Row: {
                    "assignment_id": string,"client_request_id": string,"created_at": string,"id": string,"milestone_id": string | null,"note": string | null,"review_note": string | null,"reviewed_at": string | null,"status": string,"submitted_at": string | null,"submitted_by": string,"updated_at": string,"version": number
                  }
                  ComputedFields: never
                  Insert: {
                    "assignment_id": string,"client_request_id": string,"created_at"?: string,"id"?: string,"milestone_id"?: string | null,"note"?: string | null,"review_note"?: string | null,"reviewed_at"?: string | null,"status"?: string,"submitted_at"?: string | null,"submitted_by": string,"updated_at"?: string,"version": number
                  }
                  Update: {
                    "assignment_id"?: string,"client_request_id"?: string,"created_at"?: string,"id"?: string,"milestone_id"?: string | null,"note"?: string | null,"review_note"?: string | null,"reviewed_at"?: string | null,"status"?: string,"submitted_at"?: string | null,"submitted_by"?: string,"updated_at"?: string,"version"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "submissions_assignment_id_fkey"
      columns: ["assignment_id"]
isOneToOne: false
      referencedRelation: "assignments"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "submissions_assignment_worker_fk"
      columns: ["assignment_id","submitted_by"]
isOneToOne: false
      referencedRelation: "assignments"
      referencedColumns: ["id","worker_id"]
    },{
      foreignKeyName: "submissions_milestone_assignment_fk"
      columns: ["milestone_id","assignment_id"]
isOneToOne: false
      referencedRelation: "milestones"
      referencedColumns: ["id","assignment_id"]
    },{
      foreignKeyName: "submissions_submitted_by_fkey"
      columns: ["submitted_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"worker_preferences": {
                  Row: {
                    "accepts_onsite": boolean,"accepts_remote": boolean,"created_at": string,"id": string,"latitude": number | null,"location_label": string | null,"longitude": number | null,"max_distance_km": number,"preferred_categories": (string)[],"profile_id": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "accepts_onsite"?: boolean,"accepts_remote"?: boolean,"created_at"?: string,"id"?: string,"latitude"?: number | null,"location_label"?: string | null,"longitude"?: number | null,"max_distance_km"?: number,"preferred_categories"?: (string)[],"profile_id": string,"updated_at"?: string
                  }
                  Update: {
                    "accepts_onsite"?: boolean,"accepts_remote"?: boolean,"created_at"?: string,"id"?: string,"latitude"?: number | null,"location_label"?: string | null,"longitude"?: number | null,"max_distance_km"?: number,"preferred_categories"?: (string)[],"profile_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "worker_preferences_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: true
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "apply_to_gig":
{ Args: { "p_client_request_id"?: string,"p_gig_id": string,"p_message"?: string }; Returns: {
              "client_request_id": string,
"created_at": string,
"decided_at": string | null,
"gig_id": string,
"id": string,
"message": string | null,
"status": string,
"updated_at": string,
"worker_id": string
            }
                          SetofOptions: {
        from: "*"
        to: "applications"
        isOneToOne: true
        isSetofReturn: false
      } },
"approve_assignment_completion":
{ Args: { "p_review_note"?: string,"p_submission_id": string }; Returns: {
              "assignment_id": string,
"client_request_id": string,
"created_at": string,
"id": string,
"milestone_id": string | null,
"note": string | null,
"review_note": string | null,
"reviewed_at": string | null,
"status": string,
"submitted_at": string | null,
"submitted_by": string,
"updated_at": string,
"version": number
            }
                          SetofOptions: {
        from: "*"
        to: "submissions"
        isOneToOne: true
        isSetofReturn: false
      } },
"begin_submission":
{ Args: { "p_assignment_id": string,"p_client_request_id"?: string,"p_milestone_id"?: string,"p_note"?: string }; Returns: {
              "assignment_id": string,
"client_request_id": string,
"created_at": string,
"id": string,
"milestone_id": string | null,
"note": string | null,
"review_note": string | null,
"reviewed_at": string | null,
"status": string,
"submitted_at": string | null,
"submitted_by": string,
"updated_at": string,
"version": number
            }
                          SetofOptions: {
        from: "*"
        to: "submissions"
        isOneToOne: true
        isSetofReturn: false
      } },
"calculate_distance_km":
{ Args: { "p_lat1": number,"p_lat2": number,"p_lon1": number,"p_lon2": number }; Returns: number
                           },
"cancel_proposed_assignment":
{ Args: { "p_assignment_id": string }; Returns: {
              "agreed_amount": number,
"agreed_description": string,
"agreed_title": string,
"agreement_version": number,
"application_id": string,
"cancelled_at": string | null,
"client_request_id": string,
"completed_at": string | null,
"created_at": string,
"currency": string,
"due_at": string | null,
"employer_confirmed_at": string,
"employer_id": string,
"gig_id": string,
"id": string,
"started_at": string | null,
"status": string,
"updated_at": string,
"worker_confirmed_at": string | null,
"worker_id": string
            }
                          SetofOptions: {
        from: "*"
        to: "assignments"
        isOneToOne: true
        isSetofReturn: false
      } },
"close_gig":
{ Args: { "p_gig_id": string }; Returns: {
              "application_deadline": string | null,
"budget_amount": number,
"category": string,
"closed_at": string | null,
"created_at": string,
"currency": string,
"description": string,
"due_at": string | null,
"employer_id": string,
"id": string,
"public_area": string | null,
"public_latitude": number | null,
"public_longitude": number | null,
"published_at": string | null,
"status": string,
"title": string,
"updated_at": string,
"work_mode": string
            }
                          SetofOptions: {
        from: "*"
        to: "gigs"
        isOneToOne: true
        isSetofReturn: false
      } },
"complete_onboarding":
{ Args: { "p_display_name": string,"p_home_area": string }; Returns: {
              "avatar_path": string | null,
"bio": string | null,
"created_at": string,
"display_name": string,
"home_area": string | null,
"id": string,
"onboarding_completed_at": string | null,
"preferred_mode": string,
"updated_at": string
            }
                          SetofOptions: {
        from: "*"
        to: "profiles"
        isOneToOne: true
        isSetofReturn: false
      } } |
{ Args: { "p_display_name": string,"p_home_area": string,"p_preferred_mode": string }; Returns: {
              "avatar_path": string | null,
"bio": string | null,
"created_at": string,
"display_name": string,
"home_area": string | null,
"id": string,
"onboarding_completed_at": string | null,
"preferred_mode": string,
"updated_at": string
            }
                          SetofOptions: {
        from: "*"
        to: "profiles"
        isOneToOne: true
        isSetofReturn: false
      } },
"confirm_assignment":
{ Args: { "p_assignment_id": string }; Returns: {
              "agreed_amount": number,
"agreed_description": string,
"agreed_title": string,
"agreement_version": number,
"application_id": string,
"cancelled_at": string | null,
"client_request_id": string,
"completed_at": string | null,
"created_at": string,
"currency": string,
"due_at": string | null,
"employer_confirmed_at": string,
"employer_id": string,
"gig_id": string,
"id": string,
"started_at": string | null,
"status": string,
"updated_at": string,
"worker_confirmed_at": string | null,
"worker_id": string
            }
                          SetofOptions: {
        from: "*"
        to: "assignments"
        isOneToOne: true
        isSetofReturn: false
      } },
"create_assignment_milestone":
{ Args: { "p_assignment_id": string,"p_description"?: string,"p_due_at"?: string,"p_title": string }; Returns: {
              "approved_at": string | null,
"assignment_id": string,
"created_at": string,
"description": string | null,
"due_at": string | null,
"id": string,
"position": number,
"status": string,
"title": string,
"updated_at": string
            }
                          SetofOptions: {
        from: "*"
        to: "milestones"
        isOneToOne: true
        isSetofReturn: false
      } },
"decline_assignment":
{ Args: { "p_assignment_id": string }; Returns: {
              "agreed_amount": number,
"agreed_description": string,
"agreed_title": string,
"agreement_version": number,
"application_id": string,
"cancelled_at": string | null,
"client_request_id": string,
"completed_at": string | null,
"created_at": string,
"currency": string,
"due_at": string | null,
"employer_confirmed_at": string,
"employer_id": string,
"gig_id": string,
"id": string,
"started_at": string | null,
"status": string,
"updated_at": string,
"worker_confirmed_at": string | null,
"worker_id": string
            }
                          SetofOptions: {
        from: "*"
        to: "assignments"
        isOneToOne: true
        isSetofReturn: false
      } },
"discover_gigs":
{ Args: { "p_category"?: string,"p_limit"?: number,"p_max_distance_km"?: number,"p_offset"?: number,"p_search_query"?: string,"p_work_mode"?: string,"p_worker_lat"?: number,"p_worker_lng"?: number }; Returns: {
              "budget_amount": number,"category": string,"created_at": string,"currency": string,"description": string,"distance_km": number,"employer_id": string,"id": string,"public_area": string,"public_latitude": number,"public_longitude": number,"published_at": string,"reasons": (string)[],"status": string,"title": string,"work_mode": string
            }[]
                           },
"ensure_profile":
{ Args: Record<PropertyKey, never>; Returns: {
              "avatar_path": string | null,
"bio": string | null,
"created_at": string,
"display_name": string,
"home_area": string | null,
"id": string,
"onboarding_completed_at": string | null,
"preferred_mode": string,
"updated_at": string
            }
                          SetofOptions: {
        from: "*"
        to: "profiles"
        isOneToOne: true
        isSetofReturn: false
      } },
"finalize_submission":
{ Args: { "p_files"?: Json,"p_submission_id": string }; Returns: {
              "assignment_id": string,
"client_request_id": string,
"created_at": string,
"id": string,
"milestone_id": string | null,
"note": string | null,
"review_note": string | null,
"reviewed_at": string | null,
"status": string,
"submitted_at": string | null,
"submitted_by": string,
"updated_at": string,
"version": number
            }
                          SetofOptions: {
        from: "*"
        to: "submissions"
        isOneToOne: true
        isSetofReturn: false
      } },
"get_admin_overview":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"get_admin_report":
{ Args: { "p_report_id": string }; Returns: {
              "assignment_id": string | null,
"category": string,
"client_request_id": string,
"created_at": string,
"details": string,
"gig_id": string | null,
"id": string,
"reporter_id": string,
"resolution_note": string | null,
"reviewed_at": string | null,
"reviewed_by": string | null,
"status": string,
"subject_profile_id": string | null,
"updated_at": string
            }
                          SetofOptions: {
        from: "*"
        to: "reports"
        isOneToOne: true
        isSetofReturn: false
      } },
"get_assignment_detail":
{ Args: { "p_assignment_id": string }; Returns: Json
                           },
"get_latest_assignment_submission":
{ Args: { "p_assignment_id": string }; Returns: {
              "assignment_id": string,
"client_request_id": string,
"created_at": string,
"id": string,
"milestone_id": string | null,
"note": string | null,
"review_note": string | null,
"reviewed_at": string | null,
"status": string,
"submitted_at": string | null,
"submitted_by": string,
"updated_at": string,
"version": number
            }
                          SetofOptions: {
        from: "*"
        to: "submissions"
        isOneToOne: true
        isSetofReturn: false
      } },
"get_my_capabilities":
{ Args: Record<PropertyKey, never>; Returns: {
              "is_admin": boolean,"preferred_mode": string,"role": string,"user_id": string
            }[]
                           },
"get_worker_application_for_gig":
{ Args: { "p_gig_id": string }; Returns: {
              "client_request_id": string,
"created_at": string,
"decided_at": string | null,
"gig_id": string,
"id": string,
"message": string | null,
"status": string,
"updated_at": string,
"worker_id": string
            }
                          SetofOptions: {
        from: "*"
        to: "applications"
        isOneToOne: true
        isSetofReturn: false
      } },
"list_admin_reports":
{ Args: { "p_limit"?: number,"p_offset"?: number,"p_status"?: string }; Returns: {
              "assignment_id": string | null,
"category": string,
"client_request_id": string,
"created_at": string,
"details": string,
"gig_id": string | null,
"id": string,
"reporter_id": string,
"resolution_note": string | null,
"reviewed_at": string | null,
"reviewed_by": string | null,
"status": string,
"subject_profile_id": string | null,
"updated_at": string
            }[]
                          SetofOptions: {
        from: "*"
        to: "reports"
        isOneToOne: false
        isSetofReturn: true
      } },
"list_assignment_milestones":
{ Args: { "p_assignment_id": string }; Returns: {
              "approved_at": string | null,
"assignment_id": string,
"created_at": string,
"description": string | null,
"due_at": string | null,
"id": string,
"position": number,
"status": string,
"title": string,
"updated_at": string
            }[]
                          SetofOptions: {
        from: "*"
        to: "milestones"
        isOneToOne: false
        isSetofReturn: true
      } },
"list_assignment_submissions":
{ Args: { "p_assignment_id": string }; Returns: {
              "assignment_id": string,
"client_request_id": string,
"created_at": string,
"id": string,
"milestone_id": string | null,
"note": string | null,
"review_note": string | null,
"reviewed_at": string | null,
"status": string,
"submitted_at": string | null,
"submitted_by": string,
"updated_at": string,
"version": number
            }[]
                          SetofOptions: {
        from: "*"
        to: "submissions"
        isOneToOne: false
        isSetofReturn: true
      } },
"list_gig_applicants":
{ Args: { "p_gig_id": string }; Returns: {
              "created_at": string,"decided_at": string,"gig_id": string,"id": string,"message": string,"status": string,"worker_display_name": string,"worker_home_area": string,"worker_id": string
            }[]
                           },
"list_submission_files":
{ Args: { "p_submission_id": string }; Returns: {
              "created_at": string,
"id": string,
"media_type": string,
"object_path": string,
"size_bytes": number,
"submission_id": string,
"updated_at": string,
"uploader_id": string
            }[]
                          SetofOptions: {
        from: "*"
        to: "submission_files"
        isOneToOne: false
        isSetofReturn: true
      } },
"list_user_activity":
{ Args: { "p_limit"?: number,"p_offset"?: number }; Returns: {
              "assignment_id": string,"created_at": string,"dedupe_key": string,"event_type": string,"gig_id": string,"id": string,"payload": Json,"read_at": string
            }[]
                           },
"mark_activity_read":
{ Args: { "p_event_id": string }; Returns: {
              "actor_id": string | null,
"assignment_id": string | null,
"created_at": string,
"dedupe_key": string,
"event_type": string,
"gig_id": string | null,
"id": string,
"payload": NonNullable<Json>,
"read_at": string | null,
"recipient_id": string,
"updated_at": string
            }
                          SetofOptions: {
        from: "*"
        to: "activity_events"
        isOneToOne: true
        isSetofReturn: false
      } },
"publish_gig":
{ Args: { "p_gig_id": string }; Returns: {
              "application_deadline": string | null,
"budget_amount": number,
"category": string,
"closed_at": string | null,
"created_at": string,
"currency": string,
"description": string,
"due_at": string | null,
"employer_id": string,
"id": string,
"public_area": string | null,
"public_latitude": number | null,
"public_longitude": number | null,
"published_at": string | null,
"status": string,
"title": string,
"updated_at": string,
"work_mode": string
            }
                          SetofOptions: {
        from: "*"
        to: "gigs"
        isOneToOne: true
        isSetofReturn: false
      } },
"request_submission_revision":
{ Args: { "p_review_note": string,"p_submission_id": string }; Returns: {
              "assignment_id": string,
"client_request_id": string,
"created_at": string,
"id": string,
"milestone_id": string | null,
"note": string | null,
"review_note": string | null,
"reviewed_at": string | null,
"status": string,
"submitted_at": string | null,
"submitted_by": string,
"updated_at": string,
"version": number
            }
                          SetofOptions: {
        from: "*"
        to: "submissions"
        isOneToOne: true
        isSetofReturn: false
      } },
"resolve_report":
{ Args: { "p_decision": string,"p_report_id": string,"p_resolution_note": string }; Returns: {
              "assignment_id": string | null,
"category": string,
"client_request_id": string,
"created_at": string,
"details": string,
"gig_id": string | null,
"id": string,
"reporter_id": string,
"resolution_note": string | null,
"reviewed_at": string | null,
"reviewed_by": string | null,
"status": string,
"subject_profile_id": string | null,
"updated_at": string
            }
                          SetofOptions: {
        from: "*"
        to: "reports"
        isOneToOne: true
        isSetofReturn: false
      } },
"select_worker_atomic":
{ Args: { "p_application_id": string,"p_client_request_id"?: string }; Returns: {
              "agreed_amount": number,
"agreed_description": string,
"agreed_title": string,
"agreement_version": number,
"application_id": string,
"cancelled_at": string | null,
"client_request_id": string,
"completed_at": string | null,
"created_at": string,
"currency": string,
"due_at": string | null,
"employer_confirmed_at": string,
"employer_id": string,
"gig_id": string,
"id": string,
"started_at": string | null,
"status": string,
"updated_at": string,
"worker_confirmed_at": string | null,
"worker_id": string
            }
                          SetofOptions: {
        from: "*"
        to: "assignments"
        isOneToOne: true
        isSetofReturn: false
      } },
"set_preferred_mode":
{ Args: { "p_mode": string }; Returns: {
              "avatar_path": string | null,
"bio": string | null,
"created_at": string,
"display_name": string,
"home_area": string | null,
"id": string,
"onboarding_completed_at": string | null,
"preferred_mode": string,
"updated_at": string
            }
                          SetofOptions: {
        from: "*"
        to: "profiles"
        isOneToOne: true
        isSetofReturn: false
      } },
"start_assignment_milestone":
{ Args: { "p_milestone_id": string }; Returns: {
              "approved_at": string | null,
"assignment_id": string,
"created_at": string,
"description": string | null,
"due_at": string | null,
"id": string,
"position": number,
"status": string,
"title": string,
"updated_at": string
            }
                          SetofOptions: {
        from: "*"
        to: "milestones"
        isOneToOne: true
        isSetofReturn: false
      } },
"submit_assignment_work":
{ Args: { "p_assignment_id": string,"p_client_request_id"?: string,"p_milestone_id"?: string,"p_note"?: string }; Returns: {
              "assignment_id": string,
"client_request_id": string,
"created_at": string,
"id": string,
"milestone_id": string | null,
"note": string | null,
"review_note": string | null,
"reviewed_at": string | null,
"status": string,
"submitted_at": string | null,
"submitted_by": string,
"updated_at": string,
"version": number
            }
                          SetofOptions: {
        from: "*"
        to: "submissions"
        isOneToOne: true
        isSetofReturn: false
      } },
"submit_report":
{ Args: { "p_assignment_id"?: string,"p_category": string,"p_client_request_id"?: string,"p_details": string,"p_gig_id"?: string,"p_subject_profile_id"?: string }; Returns: {
              "assignment_id": string | null,
"category": string,
"client_request_id": string,
"created_at": string,
"details": string,
"gig_id": string | null,
"id": string,
"reporter_id": string,
"resolution_note": string | null,
"reviewed_at": string | null,
"reviewed_by": string | null,
"status": string,
"subject_profile_id": string | null,
"updated_at": string
            }
                          SetofOptions: {
        from: "*"
        to: "reports"
        isOneToOne: true
        isSetofReturn: false
      } },
"withdraw_application":
{ Args: { "p_application_id": string }; Returns: {
              "client_request_id": string,
"created_at": string,
"decided_at": string | null,
"gig_id": string,
"id": string,
"message": string | null,
"status": string,
"updated_at": string,
"worker_id": string
            }
                          SetofOptions: {
        from: "*"
        to: "applications"
        isOneToOne: true
        isSetofReturn: false
      } }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "public": {
          Enums: {
            
          }
        }
} as const
