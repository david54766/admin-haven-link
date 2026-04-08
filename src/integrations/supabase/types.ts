export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      admin_announcements: {
        Row: {
          center_id: string | null
          content: string
          created_at: string
          created_by: string
          expires_at: string | null
          id: string
          is_active: boolean
          priority: string
          tenant_id: string
          title: string
        }
        Insert: {
          center_id?: string | null
          content: string
          created_at?: string
          created_by: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          priority?: string
          tenant_id?: string
          title: string
        }
        Update: {
          center_id?: string | null
          content?: string
          created_at?: string
          created_by?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          priority?: string
          tenant_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_announcements_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_announcements_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      application_form_fields: {
        Row: {
          created_at: string
          field_label: string
          field_name: string
          field_options: Json | null
          field_type: string
          id: string
          is_enabled: boolean
          is_required: boolean
          is_system_field: boolean
          order_index: number
          placeholder: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          field_label: string
          field_name: string
          field_options?: Json | null
          field_type?: string
          id?: string
          is_enabled?: boolean
          is_required?: boolean
          is_system_field?: boolean
          order_index?: number
          placeholder?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          field_label?: string
          field_name?: string
          field_options?: Json | null
          field_type?: string
          id?: string
          is_enabled?: boolean
          is_required?: boolean
          is_system_field?: boolean
          order_index?: number
          placeholder?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "application_form_fields_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      application_notification_recipients: {
        Row: {
          created_at: string
          email: string
          id: string
          is_active: boolean
          name: string | null
          tenant_id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          is_active?: boolean
          name?: string | null
          tenant_id?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          is_active?: boolean
          name?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "application_notification_recipients_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_events: {
        Row: {
          admin_only: boolean
          color: string | null
          created_at: string
          created_by: string
          description: string | null
          event_date: string
          event_time: string | null
          id: string
          tenant_id: string
          title: string
          updated_at: string
        }
        Insert: {
          admin_only?: boolean
          color?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          event_date: string
          event_time?: string | null
          id?: string
          tenant_id?: string
          title: string
          updated_at?: string
        }
        Update: {
          admin_only?: boolean
          color?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          event_date?: string
          event_time?: string | null
          id?: string
          tenant_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      centers: {
        Row: {
          address: string | null
          created_at: string
          id: string
          name: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          id?: string
          name: string
          tenant_id?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          id?: string
          name?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "centers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      certificate_templates: {
        Row: {
          background_image_url: string | null
          created_at: string
          created_by: string
          expiry_months: number | null
          id: string
          name: string
          tenant_id: string
          text_fields: Json
          updated_at: string
        }
        Insert: {
          background_image_url?: string | null
          created_at?: string
          created_by: string
          expiry_months?: number | null
          id?: string
          name?: string
          tenant_id?: string
          text_fields?: Json
          updated_at?: string
        }
        Update: {
          background_image_url?: string | null
          created_at?: string
          created_by?: string
          expiry_months?: number | null
          id?: string
          name?: string
          tenant_id?: string
          text_fields?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "certificate_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_items: {
        Row: {
          created_at: string
          id: string
          label: string
          order_index: number
          section: string | null
          template_id: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          label: string
          order_index?: number
          section?: string | null
          template_id: string
          tenant_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          order_index?: number
          section?: string | null
          template_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "checklist_items_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "checklist_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_submission_items: {
        Row: {
          created_at: string
          id: string
          is_checked: boolean
          item_id: string
          notes: string | null
          submission_id: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_checked?: boolean
          item_id: string
          notes?: string | null
          submission_id: string
          tenant_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_checked?: boolean
          item_id?: string
          notes?: string | null
          submission_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "checklist_submission_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "checklist_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_submission_items_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "checklist_submissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_submission_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_submissions: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          submission_date: string
          submitted_at: string
          template_id: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          submission_date?: string
          submitted_at?: string
          template_id: string
          tenant_id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          submission_date?: string
          submitted_at?: string
          template_id?: string
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "checklist_submissions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "checklist_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_submissions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_templates: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_active: boolean
          tenant_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_active?: boolean
          tenant_id?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_active?: boolean
          tenant_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "checklist_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      document_progress: {
        Row: {
          completed_at: string | null
          created_at: string
          document_id: string
          id: string
          tenant_id: string
          updated_at: string
          user_id: string
          viewed_at: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          document_id: string
          id?: string
          tenant_id?: string
          updated_at?: string
          user_id: string
          viewed_at?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          document_id?: string
          id?: string
          tenant_id?: string
          updated_at?: string
          user_id?: string
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_progress_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "module_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_progress_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      document_types: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          tenant_id?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_types_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          created_by: string
          date: string
          id: string
          notes: string | null
          tenant_id: string
          title: string
          updated_at: string
        }
        Insert: {
          amount: number
          category?: string
          created_at?: string
          created_by: string
          date?: string
          id?: string
          notes?: string | null
          tenant_id?: string
          title: string
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          created_by?: string
          date?: string
          id?: string
          notes?: string | null
          tenant_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      external_training_submissions: {
        Row: {
          created_at: string
          external_training_id: string | null
          file_name: string | null
          file_url: string | null
          id: string
          notes: string | null
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          submitted_at: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          external_training_id?: string | null
          file_name?: string | null
          file_url?: string | null
          id?: string
          notes?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_at?: string
          tenant_id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          external_training_id?: string | null
          file_name?: string | null
          file_url?: string | null
          id?: string
          notes?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_at?: string
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "external_training_submissions_external_training_id_fkey"
            columns: ["external_training_id"]
            isOneToOne: false
            referencedRelation: "module_external_trainings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "external_training_submissions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      homework_assignments: {
        Row: {
          created_at: string
          description: string | null
          due_days: number | null
          file_required: boolean
          id: string
          instructions: string | null
          is_required: boolean
          module_id: string
          order_index: number
          tenant_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          due_days?: number | null
          file_required?: boolean
          id?: string
          instructions?: string | null
          is_required?: boolean
          module_id: string
          order_index?: number
          tenant_id?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          due_days?: number | null
          file_required?: boolean
          id?: string
          instructions?: string | null
          is_required?: boolean
          module_id?: string
          order_index?: number
          tenant_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "homework_assignments_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "homework_assignments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      homework_submissions: {
        Row: {
          file_name: string
          file_url: string
          homework_id: string
          id: string
          notes: string | null
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          reviewed_status: string
          submitted_at: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          file_name: string
          file_url: string
          homework_id: string
          id?: string
          notes?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewed_status?: string
          submitted_at?: string
          tenant_id?: string
          user_id: string
        }
        Update: {
          file_name?: string
          file_url?: string
          homework_id?: string
          id?: string
          notes?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewed_status?: string
          submitted_at?: string
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "homework_submissions_homework_id_fkey"
            columns: ["homework_id"]
            isOneToOne: false
            referencedRelation: "homework_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "homework_submissions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      important_document_submissions: {
        Row: {
          file_name: string
          file_url: string
          id: string
          notes: string | null
          resource_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          submitted_at: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          file_name: string
          file_url: string
          id?: string
          notes?: string | null
          resource_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_at?: string
          tenant_id?: string
          user_id: string
        }
        Update: {
          file_name?: string
          file_url?: string
          id?: string
          notes?: string | null
          resource_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_at?: string
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "important_document_submissions_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "shared_resources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "important_document_submissions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_pages: {
        Row: {
          content: string
          created_at: string
          id: string
          image_caption: string | null
          image_url: string | null
          lesson_id: string
          page_number: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          content?: string
          created_at?: string
          id?: string
          image_caption?: string | null
          image_url?: string | null
          lesson_id: string
          page_number?: number
          tenant_id?: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          image_caption?: string | null
          image_url?: string | null
          lesson_id?: string
          page_number?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_pages_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "module_lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_pages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_progress: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          last_page_viewed: number
          lesson_id: string
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          last_page_viewed?: number
          lesson_id: string
          tenant_id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          last_page_viewed?: number
          lesson_id?: string
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "module_lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_progress_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      module_certificates: {
        Row: {
          center_name: string
          certificate_number: string
          created_at: string
          expiry_date: string | null
          hours_earned: number
          id: string
          instructor_name: string
          issued_at: string
          module_id: string
          module_title: string
          staff_name: string
          tenant_id: string
          track_id: string
          track_title: string
          user_id: string
        }
        Insert: {
          center_name: string
          certificate_number?: string
          created_at?: string
          expiry_date?: string | null
          hours_earned?: number
          id?: string
          instructor_name: string
          issued_at?: string
          module_id: string
          module_title: string
          staff_name: string
          tenant_id?: string
          track_id: string
          track_title: string
          user_id: string
        }
        Update: {
          center_name?: string
          certificate_number?: string
          created_at?: string
          expiry_date?: string | null
          hours_earned?: number
          id?: string
          instructor_name?: string
          issued_at?: string
          module_id?: string
          module_title?: string
          staff_name?: string
          tenant_id?: string
          track_id?: string
          track_title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "module_certificates_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "module_certificates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "module_certificates_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "training_tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      module_documents: {
        Row: {
          allow_download: boolean
          allow_mark_complete: boolean
          created_at: string
          description: string | null
          file_name: string
          file_url: string
          id: string
          is_required: boolean
          module_id: string
          order_index: number
          tenant_id: string
          title: string
          updated_at: string
        }
        Insert: {
          allow_download?: boolean
          allow_mark_complete?: boolean
          created_at?: string
          description?: string | null
          file_name: string
          file_url: string
          id?: string
          is_required?: boolean
          module_id: string
          order_index?: number
          tenant_id?: string
          title: string
          updated_at?: string
        }
        Update: {
          allow_download?: boolean
          allow_mark_complete?: boolean
          created_at?: string
          description?: string | null
          file_name?: string
          file_url?: string
          id?: string
          is_required?: boolean
          module_id?: string
          order_index?: number
          tenant_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "module_documents_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "module_documents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      module_external_trainings: {
        Row: {
          created_at: string
          description: string | null
          external_url: string
          id: string
          is_required: boolean
          module_id: string
          order_index: number
          requires_certificate: boolean
          tenant_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          external_url: string
          id?: string
          is_required?: boolean
          module_id: string
          order_index?: number
          requires_certificate?: boolean
          tenant_id?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          external_url?: string
          id?: string
          is_required?: boolean
          module_id?: string
          order_index?: number
          requires_certificate?: boolean
          tenant_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "module_external_trainings_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "module_external_trainings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      module_lessons: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_required: boolean
          module_id: string
          order_index: number
          tenant_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_required?: boolean
          module_id: string
          order_index?: number
          tenant_id?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_required?: boolean
          module_id?: string
          order_index?: number
          tenant_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "module_lessons_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "module_lessons_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      module_presentations: {
        Row: {
          allow_download: boolean
          allow_mark_complete: boolean
          created_at: string
          description: string | null
          file_name: string
          file_url: string
          id: string
          is_required: boolean
          module_id: string
          order_index: number
          tenant_id: string
          title: string
          updated_at: string
        }
        Insert: {
          allow_download?: boolean
          allow_mark_complete?: boolean
          created_at?: string
          description?: string | null
          file_name: string
          file_url: string
          id?: string
          is_required?: boolean
          module_id: string
          order_index?: number
          tenant_id?: string
          title: string
          updated_at?: string
        }
        Update: {
          allow_download?: boolean
          allow_mark_complete?: boolean
          created_at?: string
          description?: string | null
          file_name?: string
          file_url?: string
          id?: string
          is_required?: boolean
          module_id?: string
          order_index?: number
          tenant_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "module_presentations_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "module_presentations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      modules: {
        Row: {
          certificate_enabled: boolean
          certificate_expiry_days: number | null
          certificate_template_id: string | null
          certificate_title: string | null
          course_hours: number | null
          created_at: string
          description: string | null
          id: string
          instructor_name: string | null
          is_active: boolean
          order_index: number
          tenant_id: string
          title: string
          track_id: string
          updated_at: string
        }
        Insert: {
          certificate_enabled?: boolean
          certificate_expiry_days?: number | null
          certificate_template_id?: string | null
          certificate_title?: string | null
          course_hours?: number | null
          created_at?: string
          description?: string | null
          id?: string
          instructor_name?: string | null
          is_active?: boolean
          order_index?: number
          tenant_id?: string
          title: string
          track_id: string
          updated_at?: string
        }
        Update: {
          certificate_enabled?: boolean
          certificate_expiry_days?: number | null
          certificate_template_id?: string | null
          certificate_title?: string | null
          course_hours?: number | null
          created_at?: string
          description?: string | null
          id?: string
          instructor_name?: string | null
          is_active?: boolean
          order_index?: number
          tenant_id?: string
          title?: string
          track_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "modules_certificate_template_id_fkey"
            columns: ["certificate_template_id"]
            isOneToOne: false
            referencedRelation: "certificate_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "modules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "modules_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "training_tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      positions: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          order_index: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          order_index?: number
          tenant_id?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          order_index?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "positions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      presentation_progress: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          presentation_id: string
          tenant_id: string
          updated_at: string
          user_id: string
          viewed_at: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          presentation_id: string
          tenant_id?: string
          updated_at?: string
          user_id: string
          viewed_at?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          presentation_id?: string
          tenant_id?: string
          updated_at?: string
          user_id?: string
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "presentation_progress_presentation_id_fkey"
            columns: ["presentation_id"]
            isOneToOne: false
            referencedRelation: "module_presentations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "presentation_progress_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          application_message: string | null
          center_id: string | null
          checklist_email_notifications: boolean
          created_at: string
          email: string
          full_name: string
          hire_date: string | null
          id: string
          phone: string | null
          position: string | null
          status: Database["public"]["Enums"]["user_status"]
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          application_message?: string | null
          center_id?: string | null
          checklist_email_notifications?: boolean
          created_at?: string
          email: string
          full_name: string
          hire_date?: string | null
          id?: string
          phone?: string | null
          position?: string | null
          status?: Database["public"]["Enums"]["user_status"]
          tenant_id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          application_message?: string | null
          center_id?: string | null
          checklist_email_notifications?: boolean
          created_at?: string
          email?: string
          full_name?: string
          hire_date?: string | null
          id?: string
          phone?: string | null
          position?: string | null
          status?: Database["public"]["Enums"]["user_status"]
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_attempts: {
        Row: {
          answers: Json | null
          completed_at: string | null
          id: string
          max_score: number
          passed: boolean
          quiz_id: string
          score: number
          started_at: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          answers?: Json | null
          completed_at?: string | null
          id?: string
          max_score: number
          passed?: boolean
          quiz_id: string
          score?: number
          started_at?: string
          tenant_id?: string
          user_id: string
        }
        Update: {
          answers?: Json | null
          completed_at?: string | null
          id?: string
          max_score?: number
          passed?: boolean
          quiz_id?: string
          score?: number
          started_at?: string
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_attempts_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_attempts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_questions: {
        Row: {
          correct_answer: Json
          created_at: string
          id: string
          options: Json | null
          order_index: number
          points: number
          question_text: string
          question_type: string
          quiz_id: string
          tenant_id: string
        }
        Insert: {
          correct_answer: Json
          created_at?: string
          id?: string
          options?: Json | null
          order_index?: number
          points?: number
          question_text: string
          question_type?: string
          quiz_id: string
          tenant_id?: string
        }
        Update: {
          correct_answer?: Json
          created_at?: string
          id?: string
          options?: Json | null
          order_index?: number
          points?: number
          question_text?: string
          question_type?: string
          quiz_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_questions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_questions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      quizzes: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_required: boolean
          max_attempts: number | null
          module_id: string
          order_index: number
          passing_score: number
          tenant_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_required?: boolean
          max_attempts?: number | null
          module_id: string
          order_index?: number
          passing_score?: number
          tenant_id?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_required?: boolean
          max_attempts?: number | null
          module_id?: string
          order_index?: number
          passing_score?: number
          tenant_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quizzes_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quizzes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      reflection_responses: {
        Row: {
          content: string
          created_at: string
          id: string
          reflection_id: string
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          reflection_id: string
          tenant_id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          reflection_id?: string
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reflection_responses_reflection_id_fkey"
            columns: ["reflection_id"]
            isOneToOne: false
            referencedRelation: "self_reflections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reflection_responses_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      self_reflections: {
        Row: {
          content: string
          created_at: string
          id: string
          is_private: boolean
          module_id: string | null
          mood: string | null
          tags: string[] | null
          tenant_id: string
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_private?: boolean
          module_id?: string | null
          mood?: string | null
          tags?: string[] | null
          tenant_id?: string
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_private?: boolean
          module_id?: string | null
          mood?: string | null
          tags?: string[] | null
          tenant_id?: string
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "self_reflections_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "self_reflections_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      shared_resources: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          download_count: number
          file_name: string
          file_url: string
          id: string
          is_important: boolean
          link_url: string | null
          tenant_id: string
          title: string
          updated_at: string
          uploaded_by: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          download_count?: number
          file_name: string
          file_url: string
          id?: string
          is_important?: boolean
          link_url?: string | null
          tenant_id?: string
          title: string
          updated_at?: string
          uploaded_by: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          download_count?: number
          file_name?: string
          file_url?: string
          id?: string
          is_important?: boolean
          link_url?: string | null
          tenant_id?: string
          title?: string
          updated_at?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "shared_resources_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_certificates: {
        Row: {
          certificate_number: string | null
          created_at: string
          expiry_date: string | null
          file_name: string | null
          file_url: string | null
          hours: number | null
          id: string
          issue_date: string | null
          issuing_organization: string | null
          notes: string | null
          tenant_id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          certificate_number?: string | null
          created_at?: string
          expiry_date?: string | null
          file_name?: string | null
          file_url?: string | null
          hours?: number | null
          id?: string
          issue_date?: string | null
          issuing_organization?: string | null
          notes?: string | null
          tenant_id?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          certificate_number?: string | null
          created_at?: string
          expiry_date?: string | null
          file_name?: string | null
          file_url?: string | null
          hours?: number | null
          id?: string
          issue_date?: string | null
          issuing_organization?: string | null
          notes?: string | null
          tenant_id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_certificates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_documents: {
        Row: {
          document_type_id: string | null
          expires_at: string | null
          file_name: string
          file_url: string
          id: string
          tags: string[] | null
          tenant_id: string
          title: string
          updated_at: string
          uploaded_at: string
          user_id: string
        }
        Insert: {
          document_type_id?: string | null
          expires_at?: string | null
          file_name: string
          file_url: string
          id?: string
          tags?: string[] | null
          tenant_id?: string
          title: string
          updated_at?: string
          uploaded_at?: string
          user_id: string
        }
        Update: {
          document_type_id?: string | null
          expires_at?: string | null
          file_name?: string
          file_url?: string
          id?: string
          tags?: string[] | null
          tenant_id?: string
          title?: string
          updated_at?: string
          uploaded_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_documents_document_type_id_fkey"
            columns: ["document_type_id"]
            isOneToOne: false
            referencedRelation: "document_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_documents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_hours_log: {
        Row: {
          category: string
          created_at: string
          date: string
          description: string | null
          hours: number
          id: string
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string
          created_at?: string
          date: string
          description?: string | null
          hours: number
          id?: string
          tenant_id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          date?: string
          description?: string | null
          hours?: number
          id?: string
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_hours_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_track_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          id: string
          tenant_id: string
          track_id: string
          user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          tenant_id?: string
          track_id: string
          user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          tenant_id?: string
          track_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_track_assignments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_track_assignments_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "training_tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_training_goals: {
        Row: {
          created_at: string
          id: string
          required_hours: number
          set_by: string | null
          tenant_id: string
          updated_at: string
          user_id: string
          year: number
        }
        Insert: {
          created_at?: string
          id?: string
          required_hours?: number
          set_by?: string | null
          tenant_id?: string
          updated_at?: string
          user_id: string
          year: number
        }
        Update: {
          created_at?: string
          id?: string
          required_hours?: number
          set_by?: string | null
          tenant_id?: string
          updated_at?: string
          user_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "staff_training_goals_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          created_at: string
          description: string | null
          id: string
          key: string
          tenant_id: string
          updated_at: string
          value: Json
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          key: string
          tenant_id?: string
          updated_at?: string
          value?: Json
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          key?: string
          tenant_id?: string
          updated_at?: string
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "system_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          branding: Json
          created_at: string
          domain: string | null
          id: string
          is_active: boolean
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          branding?: Json
          created_at?: string
          domain?: string | null
          id?: string
          is_active?: boolean
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          branding?: Json
          created_at?: string
          domain?: string | null
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      track_certificates: {
        Row: {
          center_name: string
          certificate_number: string
          created_at: string
          expiry_date: string | null
          hours_earned: number
          id: string
          instructor_name: string
          issued_at: string
          staff_name: string
          tenant_id: string
          track_id: string
          track_title: string
          user_id: string
        }
        Insert: {
          center_name: string
          certificate_number?: string
          created_at?: string
          expiry_date?: string | null
          hours_earned?: number
          id?: string
          instructor_name: string
          issued_at?: string
          staff_name: string
          tenant_id?: string
          track_id: string
          track_title: string
          user_id: string
        }
        Update: {
          center_name?: string
          certificate_number?: string
          created_at?: string
          expiry_date?: string | null
          hours_earned?: number
          id?: string
          instructor_name?: string
          issued_at?: string
          staff_name?: string
          tenant_id?: string
          track_id?: string
          track_title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "track_certificates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "track_certificates_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "training_tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      track_position_assignments: {
        Row: {
          created_at: string
          id: string
          position_id: string
          tenant_id: string
          track_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          position_id: string
          tenant_id?: string
          track_id: string
        }
        Update: {
          created_at?: string
          id?: string
          position_id?: string
          tenant_id?: string
          track_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "track_position_assignments_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "track_position_assignments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "track_position_assignments_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "training_tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      training_tracks: {
        Row: {
          auto_assign: boolean
          certificate_enabled: boolean
          certificate_expiry_days: number | null
          certificate_mode: string
          certificate_template_id: string | null
          certificate_title: string | null
          course_hours: number | null
          created_at: string
          default_allow_download: boolean | null
          default_allow_mark_complete: boolean | null
          description: string | null
          id: string
          instructor_name: string | null
          is_active: boolean
          is_priority: boolean
          order_index: number
          tenant_id: string
          title: string
          updated_at: string
        }
        Insert: {
          auto_assign?: boolean
          certificate_enabled?: boolean
          certificate_expiry_days?: number | null
          certificate_mode?: string
          certificate_template_id?: string | null
          certificate_title?: string | null
          course_hours?: number | null
          created_at?: string
          default_allow_download?: boolean | null
          default_allow_mark_complete?: boolean | null
          description?: string | null
          id?: string
          instructor_name?: string | null
          is_active?: boolean
          is_priority?: boolean
          order_index?: number
          tenant_id?: string
          title: string
          updated_at?: string
        }
        Update: {
          auto_assign?: boolean
          certificate_enabled?: boolean
          certificate_expiry_days?: number | null
          certificate_mode?: string
          certificate_template_id?: string | null
          certificate_title?: string | null
          course_hours?: number | null
          created_at?: string
          default_allow_download?: boolean | null
          default_allow_mark_complete?: boolean | null
          description?: string | null
          id?: string
          instructor_name?: string | null
          is_active?: boolean
          is_priority?: boolean
          order_index?: number
          tenant_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_tracks_certificate_template_id_fkey"
            columns: ["certificate_template_id"]
            isOneToOne: false
            referencedRelation: "certificate_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_tracks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          tenant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          tenant_id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      video_progress: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          last_position_seconds: number
          percent_complete: number
          tenant_id: string
          updated_at: string
          user_id: string
          video_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          last_position_seconds?: number
          percent_complete?: number
          tenant_id?: string
          updated_at?: string
          user_id: string
          video_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          last_position_seconds?: number
          percent_complete?: number
          tenant_id?: string
          updated_at?: string
          user_id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_progress_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_progress_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      videos: {
        Row: {
          allow_mark_complete: boolean
          created_at: string
          description: string | null
          duration_seconds: number | null
          id: string
          is_required: boolean
          module_id: string
          order_index: number
          tenant_id: string
          title: string
          updated_at: string
          video_url: string
        }
        Insert: {
          allow_mark_complete?: boolean
          created_at?: string
          description?: string | null
          duration_seconds?: number | null
          id?: string
          is_required?: boolean
          module_id: string
          order_index?: number
          tenant_id?: string
          title: string
          updated_at?: string
          video_url: string
        }
        Update: {
          allow_mark_complete?: boolean
          created_at?: string
          description?: string | null
          duration_seconds?: number | null
          id?: string
          is_required?: boolean
          module_id?: string
          order_index?: number
          tenant_id?: string
          title?: string
          updated_at?: string
          video_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "videos_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "videos_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_current_tenant_id: { Args: never; Returns: string }
      get_own_profile: {
        Args: never
        Returns: {
          application_message: string | null
          center_id: string | null
          checklist_email_notifications: boolean
          created_at: string
          email: string
          full_name: string
          hire_date: string | null
          id: string
          phone: string | null
          position: string | null
          status: Database["public"]["Enums"]["user_status"]
          tenant_id: string
          updated_at: string
          user_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_quiz_questions_safe: {
        Args: { p_quiz_id: string }
        Returns: {
          correct_answer: Json
          created_at: string
          id: string
          options: Json
          order_index: number
          points: number
          question_text: string
          question_type: string
          quiz_id: string
        }[]
      }
      get_user_tenant_id: { Args: { _user_id: string }; Returns: string }
      grade_quiz_attempt: {
        Args: { p_answers: Json; p_quiz_id: string }
        Returns: Json
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_download_count: {
        Args: { resource_id: string }
        Returns: undefined
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_approved: { Args: { _user_id: string }; Returns: boolean }
      user_in_tenant: {
        Args: { _tenant_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "staff" | "director" | "admin" | "super_admin"
      user_status: "pending" | "approved" | "rejected" | "disabled" | "inactive"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

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
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
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
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
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
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
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
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["staff", "director", "admin", "super_admin"],
      user_status: ["pending", "approved", "rejected", "disabled", "inactive"],
    },
  },
} as const
