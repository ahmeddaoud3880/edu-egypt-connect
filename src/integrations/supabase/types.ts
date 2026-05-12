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
      administrations: {
        Row: {
          governorate_id: string | null
          id: string
          name: string | null
          name_ar: string
        }
        Insert: {
          governorate_id?: string | null
          id?: string
          name?: string | null
          name_ar: string
        }
        Update: {
          governorate_id?: string | null
          id?: string
          name?: string | null
          name_ar?: string
        }
        Relationships: [
          {
            foreignKeyName: "administrations_governorate_id_fkey"
            columns: ["governorate_id"]
            isOneToOne: false
            referencedRelation: "governorates"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_chats: {
        Row: {
          assistant_scope: string
          created_at: string | null
          id: string
          session_context: Json
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          assistant_scope?: string
          created_at?: string | null
          id?: string
          session_context?: Json
          title?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          assistant_scope?: string
          created_at?: string | null
          id?: string
          session_context?: Json
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      ai_messages: {
        Row: {
          chat_id: string
          content: string
          created_at: string | null
          id: string
          model: string | null
          provider: string | null
          role: string
          support_attachments: Json | null
        }
        Insert: {
          chat_id: string
          content: string
          created_at?: string | null
          id?: string
          model?: string | null
          provider?: string | null
          role: string
          support_attachments?: Json | null
        }
        Update: {
          chat_id?: string
          content?: string
          created_at?: string | null
          id?: string
          model?: string | null
          provider?: string | null
          role?: string
          support_attachments?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_messages_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "ai_chats"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_actions: {
        Row: {
          action_type: string
          created_at: string | null
          id: string
          new_status: string | null
          notes: string | null
          old_status: string | null
          performed_by: string | null
          performer_name: string | null
          performer_role: string | null
          request_id: string
          request_type: string
        }
        Insert: {
          action_type: string
          created_at?: string | null
          id?: string
          new_status?: string | null
          notes?: string | null
          old_status?: string | null
          performed_by?: string | null
          performer_name?: string | null
          performer_role?: string | null
          request_id: string
          request_type: string
        }
        Update: {
          action_type?: string
          created_at?: string | null
          id?: string
          new_status?: string | null
          notes?: string | null
          old_status?: string | null
          performed_by?: string | null
          performer_name?: string | null
          performer_role?: string | null
          request_id?: string
          request_type?: string
        }
        Relationships: []
      }
      assignments: {
        Row: {
          assignment_type: string | null
          class_id: string
          counts_toward_grade: boolean
          created_at: string | null
          created_by: string | null
          description: string | null
          due_date: string | null
          id: string
          is_demo: boolean | null
          max_score: number | null
          quiz_id: string | null
          subject_id: string | null
          title: string
          title_ar: string | null
        }
        Insert: {
          assignment_type?: string | null
          class_id: string
          counts_toward_grade?: boolean
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          is_demo?: boolean | null
          max_score?: number | null
          quiz_id?: string | null
          subject_id?: string | null
          title: string
          title_ar?: string | null
        }
        Update: {
          assignment_type?: string | null
          class_id?: string
          counts_toward_grade?: boolean
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          is_demo?: boolean | null
          max_score?: number | null
          quiz_id?: string | null
          subject_id?: string | null
          title?: string
          title_ar?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assignments_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_records: {
        Row: {
          class_id: string | null
          created_at: string | null
          created_by: string | null
          date: string
          id: string
          is_demo: boolean | null
          notes: string | null
          status: string
          student_id: string
        }
        Insert: {
          class_id?: string | null
          created_at?: string | null
          created_by?: string | null
          date?: string
          id?: string
          is_demo?: boolean | null
          notes?: string | null
          status?: string
          student_id: string
        }
        Update: {
          class_id?: string | null
          created_at?: string | null
          created_by?: string | null
          date?: string
          id?: string
          is_demo?: boolean | null
          notes?: string | null
          status?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_records_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      auth_login_audit: {
        Row: {
          client_info: Json | null
          created_at: string
          email_normalized: string | null
          error_message: string | null
          id: string
          success: boolean
        }
        Insert: {
          client_info?: Json | null
          created_at?: string
          email_normalized?: string | null
          error_message?: string | null
          id?: string
          success?: boolean
        }
        Update: {
          client_info?: Json | null
          created_at?: string
          email_normalized?: string | null
          error_message?: string | null
          id?: string
          success?: boolean
        }
        Relationships: []
      }
      classes: {
        Row: {
          academic_year: string | null
          capacity: number | null
          class_code: string | null
          created_at: string | null
          grade_number: number | null
          id: string
          is_demo: boolean | null
          name: string
          school_id: string | null
          stage_id: string | null
          updated_at: string | null
        }
        Insert: {
          academic_year?: string | null
          capacity?: number | null
          class_code?: string | null
          created_at?: string | null
          grade_number?: number | null
          id?: string
          is_demo?: boolean | null
          name: string
          school_id?: string | null
          stage_id?: string | null
          updated_at?: string | null
        }
        Update: {
          academic_year?: string | null
          capacity?: number | null
          class_code?: string | null
          created_at?: string | null
          grade_number?: number | null
          id?: string
          is_demo?: boolean | null
          name?: string
          school_id?: string | null
          stage_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "classes_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classes_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "stages"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string | null
          id: string
          is_read: boolean | null
          sender_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          sender_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string | null
          id: string
          last_message_at: string | null
          participant_ids: string[]
          subject: string | null
          subject_ar: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          participant_ids: string[]
          subject?: string | null
          subject_ar?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          participant_ids?: string[]
          subject?: string | null
          subject_ar?: string | null
        }
        Relationships: []
      }
      districts: {
        Row: {
          governorate_id: string | null
          id: string
          name: string
          name_ar: string | null
        }
        Insert: {
          governorate_id?: string | null
          id?: string
          name: string
          name_ar?: string | null
        }
        Update: {
          governorate_id?: string | null
          id?: string
          name?: string
          name_ar?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "districts_governorate_id_fkey"
            columns: ["governorate_id"]
            isOneToOne: false
            referencedRelation: "governorates"
            referencedColumns: ["id"]
          },
        ]
      }
      enrollments: {
        Row: {
          academic_year: string | null
          class_id: string
          enrolled_at: string | null
          id: string
          student_id: string
        }
        Insert: {
          academic_year?: string | null
          class_id: string
          enrolled_at?: string | null
          id?: string
          student_id: string
        }
        Update: {
          academic_year?: string | null
          class_id?: string
          enrolled_at?: string | null
          id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      governorates: {
        Row: {
          id: string
          name: string
          name_ar: string | null
          total_schools: number | null
          total_students: number | null
          total_teachers: number | null
        }
        Insert: {
          id?: string
          name: string
          name_ar?: string | null
          total_schools?: number | null
          total_students?: number | null
          total_teachers?: number | null
        }
        Update: {
          id?: string
          name?: string
          name_ar?: string | null
          total_schools?: number | null
          total_students?: number | null
          total_teachers?: number | null
        }
        Relationships: []
      }
      grades: {
        Row: {
          academic_year: string | null
          assignment_id: string | null
          class_id: string | null
          created_at: string | null
          created_by: string | null
          grade_date: string | null
          grade_type: string | null
          id: string
          is_demo: boolean | null
          max_score: number | null
          score: number | null
          student_id: string
          subject_id: string | null
          term: string | null
        }
        Insert: {
          academic_year?: string | null
          assignment_id?: string | null
          class_id?: string | null
          created_at?: string | null
          created_by?: string | null
          grade_date?: string | null
          grade_type?: string | null
          id?: string
          is_demo?: boolean | null
          max_score?: number | null
          score?: number | null
          student_id: string
          subject_id?: string | null
          term?: string | null
        }
        Update: {
          academic_year?: string | null
          assignment_id?: string | null
          class_id?: string | null
          created_at?: string | null
          created_by?: string | null
          grade_date?: string | null
          grade_type?: string | null
          id?: string
          is_demo?: boolean | null
          max_score?: number | null
          score?: number | null
          student_id?: string
          subject_id?: string | null
          term?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "grades_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grades_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grades_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grades_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_path_likes: {
        Row: {
          created_at: string
          id: string
          learning_path_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          learning_path_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          learning_path_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "learning_path_likes_learning_path_id_fkey"
            columns: ["learning_path_id"]
            isOneToOne: false
            referencedRelation: "learning_paths"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_paths: {
        Row: {
          content: Json | null
          created_at: string
          days: number
          difficulty: Database["public"]["Enums"]["difficulty_level"]
          id: string
          is_public: boolean
          points: number
          progress: number
          questions_per_day: number
          topic: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: Json | null
          created_at?: string
          days: number
          difficulty?: Database["public"]["Enums"]["difficulty_level"]
          id?: string
          is_public?: boolean
          points?: number
          progress?: number
          questions_per_day?: number
          topic: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: Json | null
          created_at?: string
          days?: number
          difficulty?: Database["public"]["Enums"]["difficulty_level"]
          id?: string
          is_public?: boolean
          points?: number
          progress?: number
          questions_per_day?: number
          topic?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          body_ar: string | null
          created_at: string
          id: string
          is_read: boolean
          recipient_id: string
          related_id: string | null
          related_type: string | null
          sender_id: string | null
          sender_role: string | null
          title: string
          title_ar: string
          type: string
        }
        Insert: {
          body?: string | null
          body_ar?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          recipient_id: string
          related_id?: string | null
          related_type?: string | null
          sender_id?: string | null
          sender_role?: string | null
          title: string
          title_ar?: string
          type?: string
        }
        Update: {
          body?: string | null
          body_ar?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          recipient_id?: string
          related_id?: string | null
          related_type?: string | null
          sender_id?: string | null
          sender_role?: string | null
          title?: string
          title_ar?: string
          type?: string
        }
        Relationships: []
      }
      parent_child_link_requests: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          child_name: string | null
          child_school_id: string | null
          child_student_code: string | null
          created_at: string | null
          id: string
          is_demo: boolean | null
          parent_name: string | null
          parent_national_id: string | null
          parent_user_id: string | null
          rejection_reason: string | null
          relation_type: string | null
          request_status: string | null
          review_notes: string | null
          supporting_docs_url: string | null
          updated_at: string | null
          verification_status: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          child_name?: string | null
          child_school_id?: string | null
          child_student_code?: string | null
          created_at?: string | null
          id?: string
          is_demo?: boolean | null
          parent_name?: string | null
          parent_national_id?: string | null
          parent_user_id?: string | null
          rejection_reason?: string | null
          relation_type?: string | null
          request_status?: string | null
          review_notes?: string | null
          supporting_docs_url?: string | null
          updated_at?: string | null
          verification_status?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          child_name?: string | null
          child_school_id?: string | null
          child_student_code?: string | null
          created_at?: string | null
          id?: string
          is_demo?: boolean | null
          parent_name?: string | null
          parent_national_id?: string | null
          parent_user_id?: string | null
          rejection_reason?: string | null
          relation_type?: string | null
          request_status?: string | null
          review_notes?: string | null
          supporting_docs_url?: string | null
          updated_at?: string | null
          verification_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "parent_child_link_requests_child_school_id_fkey"
            columns: ["child_school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_stats: {
        Row: {
          id: string
          satisfaction_rate: number
          total_paths: number
          total_topics: number
          total_users: number
          updated_at: string
        }
        Insert: {
          id?: string
          satisfaction_rate?: number
          total_paths?: number
          total_topics?: number
          total_users?: number
          updated_at?: string
        }
        Update: {
          id?: string
          satisfaction_rate?: number
          total_paths?: number
          total_topics?: number
          total_users?: number
          updated_at?: string
        }
        Relationships: []
      }
      profile_change_requests: {
        Row: {
          created_at: string | null
          id: string
          notes: string | null
          reason: string | null
          requested_changes: Json
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          notes?: string | null
          reason?: string | null
          requested_changes?: Json
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          notes?: string | null
          reason?: string | null
          requested_changes?: Json
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          district_id: string | null
          full_name: string | null
          full_name_ar: string | null
          gender: string | null
          governorate_id: string | null
          id: string
          national_id: string | null
          parent_national_id: string | null
          phone: string | null
          school_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          district_id?: string | null
          full_name?: string | null
          full_name_ar?: string | null
          gender?: string | null
          governorate_id?: string | null
          id: string
          national_id?: string | null
          parent_national_id?: string | null
          phone?: string | null
          school_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          district_id?: string | null
          full_name?: string | null
          full_name_ar?: string | null
          gender?: string | null
          governorate_id?: string | null
          id?: string
          national_id?: string | null
          parent_national_id?: string | null
          phone?: string | null
          school_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_district_id_fkey"
            columns: ["district_id"]
            isOneToOne: false
            referencedRelation: "districts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_governorate_id_fkey"
            columns: ["governorate_id"]
            isOneToOne: false
            referencedRelation: "governorates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_questions: {
        Row: {
          answer: string | null
          created_at: string
          id: string
          options_json: Json | null
          points: number
          question_text: string
          question_type: string
          quiz_id: string
          sort_order: number
        }
        Insert: {
          answer?: string | null
          created_at?: string
          id?: string
          options_json?: Json | null
          points?: number
          question_text: string
          question_type?: string
          quiz_id: string
          sort_order?: number
        }
        Update: {
          answer?: string | null
          created_at?: string
          id?: string
          options_json?: Json | null
          points?: number
          question_text?: string
          question_type?: string
          quiz_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "quiz_questions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quizzes: {
        Row: {
          assigned: boolean
          book_id: string | null
          class_id: string | null
          created_at: string
          due_date: string | null
          id: string
          lesson_ref: string | null
          subject_id: string | null
          teacher_id: string
          title: string
          title_ar: string | null
          updated_at: string
        }
        Insert: {
          assigned?: boolean
          book_id?: string | null
          class_id?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          lesson_ref?: string | null
          subject_id?: string | null
          teacher_id: string
          title: string
          title_ar?: string | null
          updated_at?: string
        }
        Update: {
          assigned?: boolean
          book_id?: string | null
          class_id?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          lesson_ref?: string | null
          subject_id?: string | null
          teacher_id?: string
          title?: string
          title_ar?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quizzes_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "rag_books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quizzes_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quizzes_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      rag_books: {
        Row: {
          created_at: string | null
          created_by: string | null
          file_hash: string | null
          grade_number: number | null
          id: string
          source_file: string | null
          stage_id: string | null
          subject_id: string | null
          subject_name: string | null
          title: string
          title_ar: string | null
          toc_json: Json | null
          total_chunks: number | null
          total_pages: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          file_hash?: string | null
          grade_number?: number | null
          id?: string
          source_file?: string | null
          stage_id?: string | null
          subject_id?: string | null
          subject_name?: string | null
          title: string
          title_ar?: string | null
          toc_json?: Json | null
          total_chunks?: number | null
          total_pages?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          file_hash?: string | null
          grade_number?: number | null
          id?: string
          source_file?: string | null
          stage_id?: string | null
          subject_id?: string | null
          subject_name?: string | null
          title?: string
          title_ar?: string | null
          toc_json?: Json | null
          total_chunks?: number | null
          total_pages?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rag_books_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rag_books_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      rag_chunks: {
        Row: {
          activity_title: string | null
          book_id: string
          chunk_index: number
          chunk_kind: string | null
          content: string
          content_display: string
          content_for_embedding: string
          content_tokens_est: number | null
          content_tsv: unknown
          created_at: string | null
          embedding: string | null
          extra_metadata: Json | null
          id: string
          lesson_title: string | null
          page_end: number | null
          page_number: number | null
          page_start: number | null
          quality_score: number | null
          section_path: string[] | null
        }
        Insert: {
          activity_title?: string | null
          book_id: string
          chunk_index: number
          chunk_kind?: string | null
          content: string
          content_display: string
          content_for_embedding: string
          content_tokens_est?: number | null
          content_tsv?: unknown
          created_at?: string | null
          embedding?: string | null
          extra_metadata?: Json | null
          id?: string
          lesson_title?: string | null
          page_end?: number | null
          page_number?: number | null
          page_start?: number | null
          quality_score?: number | null
          section_path?: string[] | null
        }
        Update: {
          activity_title?: string | null
          book_id?: string
          chunk_index?: number
          chunk_kind?: string | null
          content?: string
          content_display?: string
          content_for_embedding?: string
          content_tokens_est?: number | null
          content_tsv?: unknown
          created_at?: string | null
          embedding?: string | null
          extra_metadata?: Json | null
          id?: string
          lesson_title?: string | null
          page_end?: number | null
          page_number?: number | null
          page_start?: number | null
          quality_score?: number | null
          section_path?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "rag_chunks_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "rag_books"
            referencedColumns: ["id"]
          },
        ]
      }
      registration_requests: {
        Row: {
          administration_id: string | null
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          district_id: string | null
          email: string
          full_name: string
          full_name_ar: string
          gender: string | null
          governorate_id: string | null
          grade_number: number | null
          id: string
          is_demo: boolean | null
          national_id: string | null
          notes: string | null
          parent_national_id: string | null
          phone: string | null
          rejection_reason: string | null
          request_status: string | null
          requested_role: string
          school_id: string | null
          stage_id: string | null
          supporting_docs_url: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          administration_id?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          district_id?: string | null
          email: string
          full_name: string
          full_name_ar: string
          gender?: string | null
          governorate_id?: string | null
          grade_number?: number | null
          id?: string
          is_demo?: boolean | null
          national_id?: string | null
          notes?: string | null
          parent_national_id?: string | null
          phone?: string | null
          rejection_reason?: string | null
          request_status?: string | null
          requested_role: string
          school_id?: string | null
          stage_id?: string | null
          supporting_docs_url?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          administration_id?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          district_id?: string | null
          email?: string
          full_name?: string
          full_name_ar?: string
          gender?: string | null
          governorate_id?: string | null
          grade_number?: number | null
          id?: string
          is_demo?: boolean | null
          national_id?: string | null
          notes?: string | null
          parent_national_id?: string | null
          phone?: string | null
          rejection_reason?: string | null
          request_status?: string | null
          requested_role?: string
          school_id?: string | null
          stage_id?: string | null
          supporting_docs_url?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "registration_requests_administration_id_fkey"
            columns: ["administration_id"]
            isOneToOne: false
            referencedRelation: "administrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registration_requests_district_id_fkey"
            columns: ["district_id"]
            isOneToOne: false
            referencedRelation: "districts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registration_requests_governorate_id_fkey"
            columns: ["governorate_id"]
            isOneToOne: false
            referencedRelation: "governorates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registration_requests_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registration_requests_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "stages"
            referencedColumns: ["id"]
          },
        ]
      }
      role_change_requests: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          id: string
          is_demo: boolean | null
          old_role: string | null
          reason: string | null
          rejection_reason: string | null
          request_status: string | null
          requested_role: string
          scope_administration_id: string | null
          scope_governorate_id: string | null
          scope_school_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          id?: string
          is_demo?: boolean | null
          old_role?: string | null
          reason?: string | null
          rejection_reason?: string | null
          request_status?: string | null
          requested_role: string
          scope_administration_id?: string | null
          scope_governorate_id?: string | null
          scope_school_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          id?: string
          is_demo?: boolean | null
          old_role?: string | null
          reason?: string | null
          rejection_reason?: string | null
          request_status?: string | null
          requested_role?: string
          scope_administration_id?: string | null
          scope_governorate_id?: string | null
          scope_school_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "role_change_requests_scope_administration_id_fkey"
            columns: ["scope_administration_id"]
            isOneToOne: false
            referencedRelation: "administrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_change_requests_scope_governorate_id_fkey"
            columns: ["scope_governorate_id"]
            isOneToOne: false
            referencedRelation: "governorates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_change_requests_scope_school_id_fkey"
            columns: ["scope_school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      schools: {
        Row: {
          administration_id: string | null
          created_at: string | null
          district_id: string | null
          gender_type: string | null
          id: string
          is_demo: boolean | null
          name: string
          name_ar: string | null
          source_system: string | null
          stage_id: string | null
          updated_at: string | null
        }
        Insert: {
          administration_id?: string | null
          created_at?: string | null
          district_id?: string | null
          gender_type?: string | null
          id?: string
          is_demo?: boolean | null
          name: string
          name_ar?: string | null
          source_system?: string | null
          stage_id?: string | null
          updated_at?: string | null
        }
        Update: {
          administration_id?: string | null
          created_at?: string | null
          district_id?: string | null
          gender_type?: string | null
          id?: string
          is_demo?: boolean | null
          name?: string
          name_ar?: string | null
          source_system?: string | null
          stage_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "schools_administration_id_fkey"
            columns: ["administration_id"]
            isOneToOne: false
            referencedRelation: "administrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schools_district_id_fkey"
            columns: ["district_id"]
            isOneToOne: false
            referencedRelation: "districts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schools_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "stages"
            referencedColumns: ["id"]
          },
        ]
      }
      stages: {
        Row: {
          created_at: string | null
          id: string
          name: string | null
          name_ar: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name?: string | null
          name_ar: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string | null
          name_ar?: string
        }
        Relationships: []
      }
      student_activity_logs: {
        Row: {
          action_type: string
          created_at: string | null
          details: Json | null
          id: string
          user_id: string
        }
        Insert: {
          action_type: string
          created_at?: string | null
          details?: Json | null
          id?: string
          user_id: string
        }
        Update: {
          action_type?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      student_assignment_submissions: {
        Row: {
          answers_json: Json | null
          assignment_id: string
          created_at: string | null
          feedback: string | null
          grading_details: Json | null
          id: string
          score: number | null
          status: string | null
          student_id: string
          submitted_at: string | null
        }
        Insert: {
          answers_json?: Json | null
          assignment_id: string
          created_at?: string | null
          feedback?: string | null
          grading_details?: Json | null
          id?: string
          score?: number | null
          status?: string | null
          student_id: string
          submitted_at?: string | null
        }
        Update: {
          answers_json?: Json | null
          assignment_id?: string
          created_at?: string | null
          feedback?: string | null
          grading_details?: Json | null
          id?: string
          score?: number | null
          status?: string | null
          student_id?: string
          submitted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_assignment_submissions_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_assignment_submissions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_assignments: {
        Row: {
          answers_json: Json | null
          created_at: string | null
          due_date: string | null
          id: string
          priority: string | null
          status: string | null
          subject: string
          title: string
          user_id: string
        }
        Insert: {
          answers_json?: Json | null
          created_at?: string | null
          due_date?: string | null
          id?: string
          priority?: string | null
          status?: string | null
          subject: string
          title: string
          user_id: string
        }
        Update: {
          answers_json?: Json | null
          created_at?: string | null
          due_date?: string | null
          id?: string
          priority?: string | null
          status?: string | null
          subject?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      student_attendance: {
        Row: {
          created_at: string | null
          date: string
          day_name: string | null
          id: string
          status: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          date: string
          day_name?: string | null
          id?: string
          status?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          date?: string
          day_name?: string | null
          id?: string
          status?: string | null
          user_id?: string
        }
        Relationships: []
      }
      student_grades: {
        Row: {
          avg: number | null
          created_at: string | null
          homework: number | null
          id: string
          midterm: number | null
          quiz1: number | null
          quiz2: number | null
          subject: string
          term: string | null
          user_id: string
        }
        Insert: {
          avg?: number | null
          created_at?: string | null
          homework?: number | null
          id?: string
          midterm?: number | null
          quiz1?: number | null
          quiz2?: number | null
          subject: string
          term?: string | null
          user_id: string
        }
        Update: {
          avg?: number | null
          created_at?: string | null
          homework?: number | null
          id?: string
          midterm?: number | null
          quiz1?: number | null
          quiz2?: number | null
          subject?: string
          term?: string | null
          user_id?: string
        }
        Relationships: []
      }
      student_notifications: {
        Row: {
          content: string
          created_at: string | null
          id: string
          is_read: boolean | null
          type: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          type: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      student_profiles: {
        Row: {
          academic_year: string | null
          created_at: string | null
          full_name: string | null
          full_name_ar: string | null
          grade_number: number | null
          id: string
          national_id: string | null
          school_id: string | null
          stage_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          academic_year?: string | null
          created_at?: string | null
          full_name?: string | null
          full_name_ar?: string | null
          grade_number?: number | null
          id?: string
          national_id?: string | null
          school_id?: string | null
          stage_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          academic_year?: string | null
          created_at?: string | null
          full_name?: string | null
          full_name_ar?: string | null
          grade_number?: number | null
          id?: string
          national_id?: string | null
          school_id?: string | null
          stage_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_profiles_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_profiles_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "stages"
            referencedColumns: ["id"]
          },
        ]
      }
      student_subject_selections: {
        Row: {
          approved_by: string | null
          created_at: string
          id: string
          selected_at: string
          status: string
          student_id: string
          subject_id: string
        }
        Insert: {
          approved_by?: string | null
          created_at?: string
          id?: string
          selected_at?: string
          status?: string
          student_id: string
          subject_id: string
        }
        Update: {
          approved_by?: string | null
          created_at?: string
          id?: string
          selected_at?: string
          status?: string
          student_id?: string
          subject_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_subject_selections_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_subject_selections_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      student_subjects: {
        Row: {
          academic_year: string | null
          created_at: string | null
          grade_number: number | null
          id: string
          student_user_id: string | null
          subject_id: string | null
        }
        Insert: {
          academic_year?: string | null
          created_at?: string | null
          grade_number?: number | null
          id?: string
          student_user_id?: string | null
          subject_id?: string | null
        }
        Update: {
          academic_year?: string | null
          created_at?: string | null
          grade_number?: number | null
          id?: string
          student_user_id?: string | null
          subject_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_subjects_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          birth_date: string | null
          created_at: string | null
          full_name: string
          gender: string | null
          grade_number: number | null
          id: string
          is_demo: boolean | null
          national_id: string | null
          parent_national_id: string | null
          school_id: string | null
          stage_id: string | null
          student_code: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          birth_date?: string | null
          created_at?: string | null
          full_name: string
          gender?: string | null
          grade_number?: number | null
          id?: string
          is_demo?: boolean | null
          national_id?: string | null
          parent_national_id?: string | null
          school_id?: string | null
          stage_id?: string | null
          student_code?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          birth_date?: string | null
          created_at?: string | null
          full_name?: string
          gender?: string | null
          grade_number?: number | null
          id?: string
          is_demo?: boolean | null
          national_id?: string | null
          parent_national_id?: string | null
          school_id?: string | null
          stage_id?: string | null
          student_code?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "students_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "stages"
            referencedColumns: ["id"]
          },
        ]
      }
      subject_change_requests: {
        Row: {
          created_at: string
          id: string
          new_subject_id: string
          notes: string | null
          old_subject_id: string | null
          rejection_reason: string | null
          requested_by: string
          school_approved_by: string | null
          status: string
          student_id: string
          support_approved_by: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          new_subject_id: string
          notes?: string | null
          old_subject_id?: string | null
          rejection_reason?: string | null
          requested_by: string
          school_approved_by?: string | null
          status?: string
          student_id: string
          support_approved_by?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          new_subject_id?: string
          notes?: string | null
          old_subject_id?: string | null
          rejection_reason?: string | null
          requested_by?: string
          school_approved_by?: string | null
          status?: string
          student_id?: string
          support_approved_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subject_change_requests_new_subject_id_fkey"
            columns: ["new_subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subject_change_requests_old_subject_id_fkey"
            columns: ["old_subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subject_change_requests_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          color: string | null
          created_at: string | null
          grade_number: number | null
          icon: string | null
          id: string
          is_mandatory: boolean | null
          name: string
          name_ar: string
          stage_id: string | null
          subject_code: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          grade_number?: number | null
          icon?: string | null
          id?: string
          is_mandatory?: boolean | null
          name: string
          name_ar: string
          stage_id?: string | null
          subject_code?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          grade_number?: number | null
          icon?: string | null
          id?: string
          is_mandatory?: boolean | null
          name?: string
          name_ar?: string
          stage_id?: string | null
          subject_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subjects_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "stages"
            referencedColumns: ["id"]
          },
        ]
      }
      support_ai_api_credentials: {
        Row: {
          api_key: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          label: string
          model: string
          provider: string
          updated_at: string
        }
        Insert: {
          api_key?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          label?: string
          model: string
          provider: string
          updated_at?: string
        }
        Update: {
          api_key?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          label?: string
          model?: string
          provider?: string
          updated_at?: string
        }
        Relationships: []
      }
      support_tickets: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          id: string
          is_demo: boolean | null
          priority: string | null
          status: string | null
          subject: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_demo?: boolean | null
          priority?: string | null
          status?: string | null
          subject: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_demo?: boolean | null
          priority?: string | null
          status?: string | null
          subject?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      teacher_class_assignments: {
        Row: {
          academic_year: string
          assigned_by: string | null
          class_id: string
          created_at: string | null
          id: string
          subject_id: string | null
          teacher_id: string
        }
        Insert: {
          academic_year?: string
          assigned_by?: string | null
          class_id: string
          created_at?: string | null
          id?: string
          subject_id?: string | null
          teacher_id: string
        }
        Update: {
          academic_year?: string
          assigned_by?: string | null
          class_id?: string
          created_at?: string | null
          id?: string
          subject_id?: string | null
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_class_assignments_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_class_assignments_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_class_assignments_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      teachers: {
        Row: {
          created_at: string | null
          full_name: string
          id: string
          is_demo: boolean | null
          national_id: string | null
          school_id: string | null
          specialization: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          full_name: string
          id?: string
          is_demo?: boolean | null
          national_id?: string | null
          school_id?: string | null
          specialization?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          full_name?: string
          id?: string
          is_demo?: boolean | null
          national_id?: string | null
          school_id?: string | null
          specialization?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teachers_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      testimonials: {
        Row: {
          approved: boolean
          created_at: string
          id: string
          is_visible: boolean
          name: string
          rating: number
          role: string
          text: string
          user_id: string | null
        }
        Insert: {
          approved?: boolean
          created_at?: string
          id?: string
          is_visible?: boolean
          name: string
          rating?: number
          role: string
          text: string
          user_id?: string | null
        }
        Update: {
          approved?: boolean
          created_at?: string
          id?: string
          is_visible?: boolean
          name?: string
          rating?: number
          role?: string
          text?: string
          user_id?: string | null
        }
        Relationships: []
      }
      textbooks: {
        Row: {
          academic_year: string | null
          cover_color: string | null
          created_at: string | null
          id: string
          is_available: boolean | null
          name: string
          name_ar: string
          pdf_url: string | null
          semester: number | null
          subject_id: string | null
          viewer_url: string | null
        }
        Insert: {
          academic_year?: string | null
          cover_color?: string | null
          created_at?: string | null
          id?: string
          is_available?: boolean | null
          name: string
          name_ar: string
          pdf_url?: string | null
          semester?: number | null
          subject_id?: string | null
          viewer_url?: string | null
        }
        Update: {
          academic_year?: string | null
          cover_color?: string | null
          created_at?: string | null
          id?: string
          is_available?: boolean | null
          name?: string
          name_ar?: string
          pdf_url?: string | null
          semester?: number | null
          subject_id?: string | null
          viewer_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "textbooks_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      transfer_requests: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          current_administration_id: string | null
          current_school_id: string | null
          current_scope_approved: boolean | null
          entity_id: string | null
          entity_type: string | null
          higher_level_approved: boolean | null
          id: string
          is_demo: boolean | null
          reason: string | null
          rejection_reason: string | null
          request_status: string | null
          supporting_docs_url: string | null
          target_administration_id: string | null
          target_school_id: string | null
          target_scope_approved: boolean | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          current_administration_id?: string | null
          current_school_id?: string | null
          current_scope_approved?: boolean | null
          entity_id?: string | null
          entity_type?: string | null
          higher_level_approved?: boolean | null
          id?: string
          is_demo?: boolean | null
          reason?: string | null
          rejection_reason?: string | null
          request_status?: string | null
          supporting_docs_url?: string | null
          target_administration_id?: string | null
          target_school_id?: string | null
          target_scope_approved?: boolean | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          current_administration_id?: string | null
          current_school_id?: string | null
          current_scope_approved?: boolean | null
          entity_id?: string | null
          entity_type?: string | null
          higher_level_approved?: boolean | null
          id?: string
          is_demo?: boolean | null
          reason?: string | null
          rejection_reason?: string | null
          request_status?: string | null
          supporting_docs_url?: string | null
          target_administration_id?: string | null
          target_school_id?: string | null
          target_scope_approved?: boolean | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transfer_requests_current_administration_id_fkey"
            columns: ["current_administration_id"]
            isOneToOne: false
            referencedRelation: "administrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfer_requests_current_school_id_fkey"
            columns: ["current_school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfer_requests_target_administration_id_fkey"
            columns: ["target_administration_id"]
            isOneToOne: false
            referencedRelation: "administrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfer_requests_target_school_id_fkey"
            columns: ["target_school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      user_activity_logs: {
        Row: {
          action_type: string
          created_at: string | null
          details: Json | null
          id: string
          user_id: string
        }
        Insert: {
          action_type: string
          created_at?: string | null
          details?: Json | null
          id?: string
          user_id: string
        }
        Update: {
          action_type?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_memories: {
        Row: {
          facts_json: Json | null
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          facts_json?: Json | null
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          facts_json?: Json | null
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_scope_assignments: {
        Row: {
          administration_id: string | null
          assigned_at: string | null
          assigned_by: string | null
          created_at: string | null
          governorate_id: string | null
          id: string
          is_active: boolean | null
          notes: string | null
          role: string
          school_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          administration_id?: string | null
          assigned_at?: string | null
          assigned_by?: string | null
          created_at?: string | null
          governorate_id?: string | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          role: string
          school_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          administration_id?: string | null
          assigned_at?: string | null
          assigned_by?: string | null
          created_at?: string | null
          governorate_id?: string | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          role?: string
          school_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_scope_assignments_administration_id_fkey"
            columns: ["administration_id"]
            isOneToOne: false
            referencedRelation: "administrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_scope_assignments_governorate_id_fkey"
            columns: ["governorate_id"]
            isOneToOne: false
            referencedRelation: "governorates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_scope_assignments_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_all_users: {
        Args: never
        Returns: {
          created_at: string
          email: string
          id: string
          last_sign_in_at: string
        }[]
      }
      get_platform_stats: { Args: never; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      match_textbook_chunks:
        | {
            Args: {
              filter_grade?: number
              filter_stage?: string
              filter_subject?: string
              match_count?: number
              query_embedding: string
            }
            Returns: {
              book_id: string
              book_title: string
              chunk_id: string
              content: string
              page_number: number
              similarity: number
            }[]
          }
        | {
            Args: {
              filter_book_id?: string
              filter_grade?: number
              filter_min_quality?: number
              filter_stage?: string
              filter_subject?: string
              match_count?: number
              query_embedding: string
            }
            Returns: {
              book_id: string
              book_title: string
              chunk_id: string
              content: string
              page_number: number
              similarity: number
            }[]
          }
      match_textbook_chunks_fts: {
        Args: {
          filter_book_id?: string
          filter_grade?: number
          filter_min_quality?: number
          filter_stage?: string
          filter_subject?: string
          match_count?: number
          query_text: string
        }
        Returns: {
          book_id: string
          book_title: string
          chunk_id: string
          content: string
          page_number: number
          rank: number
        }[]
      }
      mcq_answer_equiv: {
        Args: { correct: string; student: string }
        Returns: boolean
      }
      parent_linked_student_ids: { Args: never; Returns: string[] }
      parent_school_message_recipients: {
        Args: { p_school_id: string }
        Returns: {
          display_name: string
          recipient_user_id: string
          school_name: string
        }[]
      }
      school_user_can_read_parent_profile: {
        Args: { profile_national_id: string }
        Returns: boolean
      }
      submit_student_quiz: {
        Args: { p_answers: Json; p_assignment_id: string }
        Returns: Json
      }
      teacher_parent_recipients_for_class: {
        Args: { p_class_id: string }
        Returns: {
          parent_display_name: string
          recipient_user_id: string
          student_id: string
          student_name: string
        }[]
      }
      tf_answer_equiv: {
        Args: { correct: string; student: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "moderator"
        | "user"
        | "support"
        | "ministry"
        | "directorate"
        | "administration"
        | "school"
        | "teacher"
        | "student"
        | "parent"
      difficulty_level: "beginner" | "intermediate" | "advanced"
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
      app_role: [
        "admin",
        "moderator",
        "user",
        "support",
        "ministry",
        "directorate",
        "administration",
        "school",
        "teacher",
        "student",
        "parent",
      ],
      difficulty_level: ["beginner", "intermediate", "advanced"],
    },
  },
} as const

